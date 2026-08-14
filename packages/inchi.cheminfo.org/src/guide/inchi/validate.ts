import type { InchiBlock } from './layers.ts';
import { findSegment, splitInchi } from './layers.ts';

export interface AnswerCheck {
  passed: boolean;
  /** The value the engine produced, for the reveal. */
  expected: string;
  /** The student's answer after normalisation. */
  actual: string;
  /** Tutor-voice explanation shown when the answer is wrong. */
  reason: string;
}

/**
 * Check an answer that should reproduce one layer of an InChI.
 * @param answer - What the student typed.
 * @param inchi - The InChI the engine produced for the exercise structure.
 * @param letter - Prefix letter of the layer under test, `''` for the formula.
 * @param block - Block the layer lives in.
 * @default block 'main'
 * @returns Whether the answer matches, and why not when it does not.
 */
export function checkLayer(
  answer: string,
  inchi: string,
  letter: string,
  block: InchiBlock = 'main',
): AnswerCheck {
  const segment = findSegment(splitInchi(inchi), letter, block);
  const expected = segment?.value ?? '';
  const actual = normaliseLayer(answer, letter);
  if (!expected) {
    return {
      passed: actual === '',
      expected: '(this structure has no such layer)',
      actual,
      reason:
        actual === ''
          ? ''
          : `This structure has no /${letter} layer — leave the box empty.`,
    };
  }
  if (actual === expected) {
    return { passed: true, expected, actual, reason: '' };
  }
  return {
    passed: false,
    expected,
    actual,
    reason: describeLayerMismatch(actual, expected, letter),
  };
}

/**
 * Check an answer that should reproduce a whole InChI string.
 * @param answer - What the student typed, with or without the prologue.
 * @param inchi - The InChI the engine produced.
 * @returns Whether the answer matches, and why not when it does not.
 */
export function checkFullInchi(answer: string, inchi: string): AnswerCheck {
  const expected = inchi.trim();
  const trimmed = answer.trim().replaceAll(/\s+/g, '');
  const actual = trimmed.startsWith('InChI=')
    ? trimmed
    : `InChI=1S/${trimmed.replace(/^\//, '')}`;
  if (actual === expected) {
    return { passed: true, expected, actual, reason: '' };
  }
  return {
    passed: false,
    expected,
    actual,
    reason: describeInchiMismatch(actual, expected),
  };
}

/**
 * Check a free-text answer against an exact expected string, ignoring
 * case and surrounding whitespace.
 * @param answer - What the student typed.
 * @param expected - The expected answer.
 * @returns Whether the answer matches.
 */
export function checkText(answer: string, expected: string): AnswerCheck {
  const actual = answer.trim();
  const passed = actual.toLowerCase() === expected.trim().toLowerCase();
  return {
    passed,
    expected,
    actual,
    reason: passed
      ? ''
      : `Expected ${expected}, you wrote ${actual || '(nothing)'}.`,
  };
}

function normaliseLayer(answer: string, letter: string): string {
  let value = answer.trim().replaceAll(/\s+/g, '');
  value = value.replace(/^InChI=1S?\//i, '');
  if (letter && value.startsWith(`/${letter}`)) {
    return value.slice(letter.length + 1);
  }
  if (letter && value.startsWith(letter) && value.length > 1) {
    return value.slice(letter.length);
  }
  return value.replace(/^\//, '');
}

function describeLayerMismatch(
  actual: string,
  expected: string,
  letter: string,
): string {
  if (!actual) return `Nothing to check yet — write the /${letter} layer.`;
  const position = firstDifference(actual, expected);
  if (position === expected.length && actual.length > expected.length) {
    return `Your answer is right up to "${expected}" but carries on with "${actual.slice(position)}".`;
  }
  if (position === actual.length) {
    return `Your answer stops early: after "${actual}" the layer continues.`;
  }
  return `The layers agree for the first ${position} character${position === 1 ? '' : 's'} ("${expected.slice(0, position)}") and then differ: you wrote "${actual[position]}".`;
}

function describeInchiMismatch(actual: string, expected: string): string {
  const mine = splitInchi(actual);
  const theirs = splitInchi(expected);
  for (const segment of theirs.segments) {
    const own = findSegment(mine, segment.letter, segment.block);
    if (!own) {
      return `The ${segment.name.toLowerCase()} layer is missing: /${segment.letter}${segment.value}`;
    }
    if (own.value !== segment.value) {
      return `The ${segment.name.toLowerCase()} layer differs: you wrote /${segment.letter}${own.value}.`;
    }
  }
  const extra = mine.segments.find(
    (segment) => !findSegment(theirs, segment.letter, segment.block),
  );
  if (extra) {
    return `This structure has no /${extra.letter} layer, but you wrote one.`;
  }
  return 'The string differs from the one the engine produces.';
}

function firstDifference(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return length;
}
