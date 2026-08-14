import type { MoreTabId } from './components/moreTabs.ts';
import { MORE_TABS } from './components/moreTabs.ts';

/** A page of the playground, root tabs and More pages alike. */
export type TabId =
  'convert' | 'batch' | 'tutorial' | 'exercises' | 'cheatsheet' | MoreTabId;

/** Every accepted root tab id; a hash naming anything else falls back. */
export const VALID_TABS: ReadonlySet<string> = new Set<TabId>([
  'convert',
  'batch',
  'tutorial',
  'exercises',
  'cheatsheet',
  ...MORE_TABS.map((tab) => tab.id),
]);

/** The tab shown when the hash names none of the valid ones. */
export const FALLBACK_TAB: TabId = 'convert';

/** A sub-tab of the Tests page. */
export type TestsTabId = 'forward' | 'roundtrip';

/** Every accepted Tests sub-tab id. */
export const VALID_TESTS_TABS: ReadonlySet<string> = new Set<TestsTabId>([
  'forward',
  'roundtrip',
]);

/** The Tests sub-tab shown when the hash names neither. */
export const FALLBACK_TESTS_TAB: TestsTabId = 'forward';
