import { signal } from '@preact/signals-react';

import type { TabId, TestsTabId } from '../tabs.ts';
import {
  FALLBACK_TAB,
  FALLBACK_TESTS_TAB,
  VALID_TABS,
  VALID_TESTS_TABS,
} from '../tabs.ts';

/**
 * What is on screen. Session-only: the page is restored from the URL
 * hash rather than from storage, so a link opens where it points.
 */
export const view = {
  /** The page on show. */
  tab: signal<TabId>(FALLBACK_TAB),
  /** The sub-tab of the Tests page. */
  testsTab: signal<TestsTabId>(FALLBACK_TESTS_TAB),
  /** True while the drawing is being converted to an InChI. */
  structurePending: signal(false),
  /** True while the typed InChI is being turned back into a structure. */
  inchiPending: signal(false),
};

/**
 * Open a page, ignoring anything that is not one.
 * @param next - The tab id the reader picked.
 */
export function selectTab(next: string | number): void {
  const candidate = String(next);
  view.tab.value = VALID_TABS.has(candidate)
    ? (candidate as TabId)
    : FALLBACK_TAB;
}

/**
 * Open a test category, ignoring anything that is not one.
 * @param next - The sub-tab id the reader picked.
 */
export function selectTestsTab(next: string | number): void {
  const candidate = String(next);
  view.testsTab.value = VALID_TESTS_TABS.has(candidate)
    ? (candidate as TestsTabId)
    : FALLBACK_TESTS_TAB;
}
