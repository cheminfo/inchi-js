import type { InchiBlock } from '../inchi/layers.ts';

export type GuideLevel = 'basics' | 'variable' | 'stereo';

export interface LevelInfo {
  id: GuideLevel;
  title: string;
  /** Blueprint intent used for tags and callouts at this level. */
  intent: 'success' | 'warning' | 'danger';
  background: string;
  border: string;
}

export const LEVELS: readonly LevelInfo[] = [
  {
    id: 'basics',
    title: 'The skeleton',
    intent: 'success',
    background: '#e8f5ec',
    border: '#4c9a68',
  },
  {
    id: 'variable',
    title: 'Charges & mobile H',
    intent: 'warning',
    background: '#fdf3e0',
    border: '#bf7326',
  },
  {
    id: 'stereo',
    title: 'Stereo & isotopes',
    intent: 'danger',
    background: '#fbebef',
    border: '#c2405a',
  },
] as const;

export interface FocusLayer {
  letter: string;
  block?: InchiBlock;
}

export type PanelKind =
  | 'layers'
  | 'formula'
  | 'numbering'
  | 'connections'
  | 'hydrogens'
  | 'stereo'
  | 'isotopes'
  | 'inchikey';

export interface TutorialStep {
  id: string;
  title: string;
  level: GuideLevel;
  /** Prose introducing the step; may carry `[[glossary]]` markers. */
  description: string;
  /** Structure the step is worked on, as SMILES. */
  smiles: string;
  /** Layer the step is about; highlighted in the live InChI. */
  focus: FocusLayer | null;
  /** Which live derivation panel the step shows under the structure. */
  panel: PanelKind;
  /** The pen-and-paper procedure, one instruction per entry. */
  procedure: string[];
  /** Where the hand method runs out, when it does. */
  caveat?: string;
  /** Extra options handed to the engine for this step. */
  inchiOptions?: string;
}

export type ExerciseKind = 'layer' | 'full' | 'read';

export interface Exercise {
  id: string;
  title: string;
  level: GuideLevel;
  kind: ExerciseKind;
  /** Prose stating the task; may carry `[[glossary]]` markers. */
  description: string;
  /** Ordered from a nudge to almost the answer. */
  hints: string[];
  /** Structure to work from, for `layer` and `full` exercises. */
  smiles?: string;
  /** InChI to read, for `read` exercises. */
  inchi?: string;
  /** Layer under test, for `layer` exercises. */
  letter?: string;
  block?: InchiBlock;
  /** Expected answer, for `read` exercises. */
  expected?: string;
  placeholder?: string;
}

export interface GlossaryExample {
  snippet: string;
  on?: string;
  note?: string;
}

export interface GlossaryEntry {
  title: string;
  summary: string;
  examples: GlossaryExample[];
}

export interface ReferenceRow {
  syntax: string;
  description: string;
  /** Friendly name shown in the rich tooltip. */
  name?: string;
  detail?: string;
  example?: { snippet: string; input: string; note: string };
}

export interface ReferenceSection {
  title: string;
  colour: string;
  rows: ReferenceRow[];
}
