import { batch, effect } from '@preact/signals-react';

import { EXERCISES } from './guide/data/exercises.ts';
import { TUTORIAL_STEPS } from './guide/data/tutorial.ts';
import { hashSegments } from './hashRoute.ts';
import { state } from './state/index.ts';
import type { TabId, TestsTabId } from './tabs.ts';
import { VALID_TABS, VALID_TESTS_TABS } from './tabs.ts';

let started = false;

/**
 * Keep the view and `window.location.hash` in step, so every page is
 * deep-linkable and the browser back button works. `localStorage` is
 * not this module's business: the preferences bucket persists itself.
 */
export function startRouting(): void {
  if (started) return;
  started = true;

  readHash();
  globalThis.addEventListener('hashchange', readHash);

  effect(() => {
    const hash = viewHash();
    // replaceState rather than push, so Back leaves the app instead of
    // walking every step the reader visited.
    if (globalThis.location.hash !== hash) {
      globalThis.history.replaceState(null, '', hash);
    }
  });
}

/**
 * The hash the current view should be reachable at.
 * @returns A hash of the shape `#/<tab>` or `#/<tab>/<item>`.
 */
function viewHash(): string {
  const tab = state.view.tab.value;
  const item = itemOf(tab);
  return item ? `#/${tab}/${item}` : `#/${tab}`;
}

/**
 * The second hash segment a tab carries, when it has one.
 * @param tab - The page on show.
 * @returns The item id, empty for a tab that has none.
 */
function itemOf(tab: TabId): string {
  if (tab === 'tests') return state.view.testsTab.value;
  if (tab === 'tutorial') return state.preferences.guide.step.value;
  if (tab === 'exercises') return state.preferences.guide.exerciseId.value;
  return '';
}

/** Adopt a hash the reader navigated to, ignoring anything unknown. */
function readHash(): void {
  const [tab, item] = hashSegments();
  if (!tab || !VALID_TABS.has(tab)) return;
  batch(() => {
    state.view.tab.value = tab as TabId;
    if (!item) return;
    if (tab === 'tests' && VALID_TESTS_TABS.has(item)) {
      state.view.testsTab.value = item as TestsTabId;
    } else if (
      tab === 'tutorial' &&
      TUTORIAL_STEPS.some((step) => step.id === item)
    ) {
      state.preferences.guide.step.value = item;
    } else if (
      tab === 'exercises' &&
      EXERCISES.some((exercise) => exercise.id === item)
    ) {
      state.preferences.guide.exerciseId.value = item;
    }
  });
}
