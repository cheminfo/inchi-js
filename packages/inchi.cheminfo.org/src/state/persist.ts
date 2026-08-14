import { Signal, effect } from '@preact/signals-react';

import { readStoredJson, writeStoredJson } from '../storage.ts';

/** A signal, seen as an opaque box the persistence layer can read and fill. */
interface SignalLeaf {
  value: unknown;
}

/** A tree of signals, grouped by feature. */
export interface Bucket {
  [name: string]: SignalLeaf | Bucket;
}

/**
 * Rehydrate a bucket from `localStorage` and keep it there.
 *
 * The whole tree lives under one namespaced key, so there is no
 * per-signal bookkeeping: the stored JSON mirrors the bucket, and a
 * property that is missing from an older save simply keeps its default.
 * @param key - The namespaced `localStorage` key holding the bucket.
 * @param bucket - The tree of signals to rehydrate and follow.
 * @returns That same bucket, for a one-line `export const`.
 */
export function persistBucket<TBucket extends Bucket>(
  key: string,
  bucket: TBucket,
): TBucket {
  const stored = readStoredJson(key);
  if (isRecord(stored)) hydrate(bucket, stored);
  effect(() => writeStoredJson(key, snapshot(bucket)));
  return bucket;
}

function hydrate(bucket: Bucket, stored: Record<string, unknown>): void {
  for (const [name, node] of Object.entries(bucket)) {
    const value = stored[name];
    if (value === undefined) continue;
    if (node instanceof Signal) {
      node.value = value;
    } else if (isRecord(value)) {
      hydrate(node as Bucket, value);
    }
  }
}

function snapshot(bucket: Bucket): Record<string, unknown> {
  const plain: Record<string, unknown> = {};
  for (const [name, node] of Object.entries(bucket)) {
    plain[name] =
      node instanceof Signal ? node.value : snapshot(node as Bucket);
  }
  return plain;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
