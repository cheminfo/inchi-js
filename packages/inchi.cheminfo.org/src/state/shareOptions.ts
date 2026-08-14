import type { TabId } from '../tabs.ts';

import type { HideKey, ShareConfig } from './shareConfig.ts';

export interface ShareFeature {
  key: HideKey;
  /** Named positively: the dialog shows a ticked box for what stays visible. */
  label: string;
  /** What switching it off does, for the person building the link. */
  description: string;
  /**
   * Off in a link that was not touched: what a page framed elsewhere has no
   * use for.
   * @default false
   */
  hiddenByDefault?: boolean;
  /**
   * Part of the header, so a framed link has nothing to switch off.
   * @default false
   */
  needsHeader?: boolean;
}

export interface PageShareOptions {
  /** How the page is named in the dialog and in the iframe title. */
  title: string;
  /** What this page in particular can switch off, after the shell. */
  features: ShareFeature[];
}

/**
 * What the share dialog can configure on a page: the shell first, then
 * whatever that page owns.
 * @param tab - The page currently open.
 * @returns Its title and the parts it can switch off.
 */
export function shareOptionsOf(tab: TabId): PageShareOptions {
  const page = PAGES[tab] ?? { title: tab, features: [] };
  return { title: page.title, features: [...SHELL, ...page.features] };
}

/**
 * The link the dialog offers before anything is ticked: framed, without the
 * parts an embedder has no use for.
 * @param options - What the page can configure.
 * @returns The configuration to start from.
 */
export function defaultShareConfig(options: PageShareOptions): ShareConfig {
  const hidden: HideKey[] = [];
  for (const feature of options.features) {
    if (feature.hiddenByDefault) hidden.push(feature.key);
  }
  return { embed: true, hidden };
}

const SHELL: ShareFeature[] = [
  {
    key: 'tabs',
    label: 'The menu',
    description:
      'The tab strip and the More dropdown. Hiding it leaves the visitor on the page your link opens.',
    hiddenByDefault: true,
  },
  {
    key: 'links',
    label: 'The header links',
    description:
      'The InChI version, the API documentation and the source repository, in the header.',
    needsHeader: true,
  },
];

const CONVERT: ShareFeature[] = [
  {
    key: 'structure',
    label: 'Structure → InChI',
    description:
      'The drawing canvas and the InChI it produces. Hide it for a frame that only reads an InChI back as a structure.',
  },
  {
    key: 'inchi',
    label: 'InChI → structure',
    description:
      'The InChI box and the structure it draws. Hide it for a frame that only writes InChIs.',
  },
];

const TUTORIAL: ShareFeature[] = [
  {
    key: 'steps',
    label: 'The step picker',
    description:
      'The numbered strips above the step. Previous and Next still walk through the derivation.',
  },
];

const EXERCISES: ShareFeature[] = [
  {
    key: 'list',
    label: 'The list of exercises',
    description:
      'The column on the left, and the progress bar above it. Hiding it leaves the link on the exercise it names.',
  },
  {
    key: 'hints',
    label: 'Hints',
    description: 'The hint ladder, revealed one rung at a time.',
  },
  {
    key: 'answers',
    label: 'Reveal the answer',
    description:
      'The correction. Hiding it leaves getting it right as the only way through.',
  },
  {
    key: 'clear',
    label: 'Clear the answers',
    description:
      'The buttons that forget what was done, for one exercise and for all of them.',
  },
];

const PAGES: Partial<Record<TabId, PageShareOptions>> = {
  convert: { title: 'Convert', features: CONVERT },
  batch: { title: 'Batch convert', features: [] },
  tutorial: { title: 'Tutorial', features: TUTORIAL },
  exercises: { title: 'Exercises', features: EXERCISES },
  cheatsheet: { title: 'Cheatsheet', features: [] },
  tests: { title: 'Tests', features: [] },
  download: { title: 'Download', features: [] },
  about: { title: 'About', features: [] },
};
