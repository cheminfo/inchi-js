import type { IconName } from '@blueprintjs/icons';

/** One entry of the More dropdown. */
export interface MoreTab {
  /** Hash route segment, e.g. `#/tests`. */
  id: string;
  /** Label in the menu. */
  title: string;
  /** Blueprint icon shown beside the label. */
  icon: IconName;
}

/** The pages reachable from the More dropdown, in menu order. */
export const MORE_TABS = [
  { id: 'tests', title: 'Tests', icon: 'lab-test' },
  { id: 'download', title: 'Download', icon: 'download' },
  { id: 'about', title: 'About', icon: 'info-sign' },
] as const satisfies readonly MoreTab[];

/** Id of a page reachable from the More dropdown. */
export type MoreTabId = (typeof MORE_TABS)[number]['id'];

/**
 * Whether a tab id is one of the More pages.
 * @param id - The active root tab id.
 * @returns True when the More dropdown owns that page.
 */
export function isMoreTab(id: string): id is MoreTabId {
  return MORE_TABS.some((tab) => tab.id === id);
}
