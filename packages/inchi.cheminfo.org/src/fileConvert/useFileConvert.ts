import type { OutputFormat } from 'inchi-api/convert';
import { useCallback, useEffect, useRef, useState } from 'react';

import { messageOf } from '../messageOf.ts';

import type {
  ConvertRequest,
  ConvertedFile,
  DetectRequest,
  FilePreview,
  ReformatRequest,
  WorkerOutbound,
} from './protocol.ts';

/**
 * Which computed columns a conversion writes out. Every one of them is always
 * computed; this only selects what the file carries and what the table draws.
 */
export interface AppendedSelection {
  smiles: boolean;
  inchi: boolean;
  inchikey: boolean;
  auxinfo: boolean;
}

/** Where the panel currently is in the load → convert → download flow. */
export type ConvertStatus =
  'idle' | 'reading' | 'ready' | 'converting' | 'done' | 'error';

/** Options the user picks before running a conversion. */
export interface ConvertSettings {
  /** Structure column to read; auto-detected when empty. */
  column: string;
  /** Raw InChI option string forwarded to the C API. */
  inchiOptions: string;
  /** Whether the `SMILES` column is appended, when the file allows it. */
  smiles: boolean;
  /** Whether the `InChI` column is appended. */
  inchi: boolean;
  /** Whether the `InChIKey` column is appended. */
  inchikey: boolean;
  /** Whether the AuxInfo layer is appended. */
  auxinfo: boolean;
}

/** State and actions driving the file conversion panel. */
export interface FileConvert {
  status: ConvertStatus;
  /** The picked file, `null` until one is chosen. */
  file: File | null;
  /** Format, columns, detection, and a five-record sample. */
  preview: FilePreview | null;
  /** Records converted so far, while `status` is `converting`. */
  progress: { done: number; total: number };
  /** The converted file, once `status` is `done`. */
  result: ConvertedFile | null;
  /** Whether the converted file is being written out in another format. */
  reformatting: boolean;
  /** Why the last step failed, when `status` is `error`. */
  error: string;
  /** Load a file and detect its structure column. */
  load: (file: File) => void;
  /** Re-run the detection forcing a given column. */
  useColumn: (column: string) => void;
  /** Run the conversion with the given settings. */
  convert: (settings: ConvertSettings) => void;
  /**
   * Write the conversion out again — in another format, or with another set of
   * computed columns — reusing the InChIs already computed.
   */
  reformat: (
    output: Exclude<OutputFormat, 'same'>,
    selection: AppendedSelection,
  ) => void;
  /** Drop the file and every derived state. */
  reset: () => void;
}

/**
 * Drive the conversion worker: load a file, detect its structure column, then
 * convert it. Every parse and every InChI call happens in the worker, so a
 * 10 000-record SDF never freezes the page.
 * @returns The current state plus the actions the panel binds to.
 */
export function useFileConvert(): FileConvert {
  const [status, setStatus] = useState<ConvertStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ConvertedFile | null>(null);
  const [reformatting, setReformatting] = useState(false);
  const [error, setError] = useState('');

  const workerRef = useRef<Worker | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const send = useCallback((message: DetectRequest | ConvertRequest) => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('convertWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener(
      'message',
      (event: MessageEvent<WorkerOutbound>) => {
        const data = event.data;
        if (data.type === 'preview') {
          setPreview(data.preview);
          setStatus('ready');
        } else if (data.type === 'progress') {
          setProgress({ done: data.done, total: data.total });
        } else if (data.type === 'converted') {
          setResult(data);
          setReformatting(false);
          setStatus('done');
        } else {
          setError(data.message);
          setReformatting(false);
          setStatus('error');
        }
      },
    );
    worker.addEventListener('error', (event) => {
      setError(event.message || 'the conversion worker crashed');
      setReformatting(false);
      setStatus('error');
    });
    workerRef.current = worker;
    worker.postMessage(message, [message.bytes]);
  }, []);

  const start = useCallback(
    (next: File, column: string | undefined) => {
      setStatus('reading');
      setError('');
      setResult(null);
      next
        .arrayBuffer()
        .then((bytes) => {
          send({ type: 'detect', bytes, filename: next.name, column });
        })
        .catch((error_: unknown) => {
          setError(messageOf(error_));
          setStatus('error');
        });
    },
    [send],
  );

  const load = useCallback(
    (next: File) => {
      fileRef.current = next;
      setFile(next);
      setPreview(null);
      start(next, undefined);
    },
    [start],
  );

  const useColumn = useCallback(
    (column: string) => {
      const current = fileRef.current;
      if (current) start(current, column || undefined);
    },
    [start],
  );

  const convert = useCallback(
    (settings: ConvertSettings) => {
      const current = fileRef.current;
      if (!current) return;
      setStatus('converting');
      setError('');
      setResult(null);
      setProgress({ done: 0, total: preview?.rowCount ?? 0 });
      current
        .arrayBuffer()
        .then((bytes) => {
          send({
            type: 'convert',
            bytes,
            filename: current.name,
            // The download section is where the format is picked; the
            // conversion itself always mirrors the input.
            output: 'same',
            column: settings.column || undefined,
            inchiOptions: settings.inchiOptions,
            smiles: settings.smiles,
            inchi: settings.inchi,
            inchikey: settings.inchikey,
            auxinfo: settings.auxinfo,
          });
        })
        .catch((error_: unknown) => {
          setError(messageOf(error_));
          setStatus('error');
        });
    },
    [send, preview],
  );

  // The worker that ran the conversion is kept alive, holding the enriched
  // records, so another format is a serialization away.
  const reformat = useCallback(
    (output: Exclude<OutputFormat, 'same'>, selection: AppendedSelection) => {
      const worker = workerRef.current;
      if (!worker) return;
      setReformatting(true);
      setError('');
      const message: ReformatRequest = {
        type: 'reformat',
        output,
        ...selection,
      };
      worker.postMessage(message);
    },
    [],
  );

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    fileRef.current = null;
    setFile(null);
    setPreview(null);
    setResult(null);
    setReformatting(false);
    setError('');
    setProgress({ done: 0, total: 0 });
    setStatus('idle');
  }, []);

  return {
    status,
    file,
    preview,
    progress,
    result,
    reformatting,
    error,
    load,
    useColumn,
    convert,
    reformat,
    reset,
  };
}
