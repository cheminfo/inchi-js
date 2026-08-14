import { Button, ButtonGroup, Callout, Icon, Tag } from '@blueprintjs/core';
import type { OutputFormat } from 'inchi-api/convert';

import { downloadConverted, sizeOf } from '../download.ts';
import type { ConvertedFile } from '../protocol.ts';

/** A concrete format the converted file can be downloaded in. */
export type DownloadFormat = Exclude<OutputFormat, 'same'>;

const DOWNLOAD_FORMATS: DownloadFormat[] = [
  'csv',
  'tsv',
  'xlsx',
  'sdf',
  'json',
];

/** Props of {@link ResultCard}. */
export interface ResultCardProps {
  /** The converted file returned by the worker. */
  result: ConvertedFile;
  /** Whether the file is being written out in another format. */
  reformatting: boolean;
  /** Write the same records out again in the given format. */
  onReformat: (output: DownloadFormat) => void;
}

/**
 * Outcome of a conversion: the counters, the format picker, and the download
 * button. Switching format only rewrites the file — no InChI is computed again.
 * @param props - The converted file, and the reformat action.
 * @returns The result card JSX.
 */
export function ResultCard(props: ResultCardProps) {
  const { result, reformatting, onReformat } = props;
  const { stats, format, body, filename } = result;

  return (
    <div className="panel">
      <h2 className="section-title">
        <Icon icon="tick-circle" intent="success" /> Done
      </h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tag minimal size="large">
          {stats.total} record{stats.total === 1 ? '' : 's'}
        </Tag>
        <Tag minimal={stats.converted === 0} intent="success" size="large">
          {stats.converted} converted
        </Tag>
        <Tag minimal={stats.failed === 0} intent="danger" size="large">
          {stats.failed} failed
        </Tag>
        {stats.skipped > 0 && (
          <Tag intent="warning" size="large">
            {stats.skipped} skipped
          </Tag>
        )}
        <Tag minimal size="large">
          {format.toUpperCase()} · {sizeOf(body)}
        </Tag>
      </div>

      {stats.failed > 0 && (
        <Callout intent="warning" icon="warning-sign">
          {stats.failed} record{stats.failed === 1 ? '' : 's'} produced no
          InChI. The reason for each is in the <strong>InChI_Message</strong>{' '}
          column of the table above — it is not written to the downloaded file.
        </Callout>
      )}

      {stats.skipped > 0 && (
        <Callout intent="warning" icon="warning-sign">
          {stats.skipped} record{stats.skipped === 1 ? '' : 's'} could not be
          written to the SDF because no molfile could be built from the
          structure.
        </Callout>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Button
          intent="success"
          icon="download"
          size="large"
          loading={reformatting}
          onClick={() => {
            downloadConverted(result);
          }}
        >
          Download {filename}
        </Button>
        <span className="muted">as</span>
        <ButtonGroup>
          {DOWNLOAD_FORMATS.map((candidate) => (
            <Button
              key={candidate}
              active={candidate === format}
              disabled={reformatting}
              onClick={() => {
                if (candidate !== format) onReformat(candidate);
              }}
            >
              {candidate.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  );
}
