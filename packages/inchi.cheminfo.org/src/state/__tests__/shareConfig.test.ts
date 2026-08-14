import { expect, test } from 'vitest';

import {
  applyShareConfig,
  isShareConfigured,
  parseShareConfig,
  stringifyParams,
} from '../shareConfig.ts';
import { defaultShareConfig, shareOptionsOf } from '../shareOptions.ts';

test('an address without share parameters configures nothing', () => {
  const config = parseShareConfig('');

  expect(config).toStrictEqual({ embed: false, hidden: [] });
  expect(isShareConfigured(config)).toBe(false);
});

test('embed is on for a bare parameter and off only for 0', () => {
  expect(parseShareConfig('?embed').embed).toBe(true);
  expect(parseShareConfig('?embed=1').embed).toBe(true);
  expect(parseShareConfig('embed=true').embed).toBe(true);
  expect(parseShareConfig('?embed=0').embed).toBe(false);
});

test('hide reads a comma separated list, dropping unknown and repeated keys', () => {
  const config = parseShareConfig('?embed=1&hide=tabs, hints ,tabs,elephant');

  expect(config).toStrictEqual({ embed: true, hidden: ['tabs', 'hints'] });
  expect(isShareConfigured(config)).toBe(true);
});

test('an unconfigured link keeps neither parameter', () => {
  const params = new URLSearchParams('embed=1&hide=tabs&other=kept');
  applyShareConfig(params, { embed: false, hidden: [] });

  expect(stringifyParams(params)).toBe('other=kept');
});

test('a configured link round-trips through the query string', () => {
  const params = new URLSearchParams();
  applyShareConfig(params, { embed: true, hidden: ['tabs', 'answers'] });
  const query = stringifyParams(params);

  expect(query).toBe('embed=1&hide=tabs,answers');
  expect(parseShareConfig(query)).toStrictEqual({
    embed: true,
    hidden: ['tabs', 'answers'],
  });
});

test('every page can hide the shell, and the exercises their own parts', () => {
  expect(shareOptionsOf('cheatsheet').features.map((f) => f.key)).toStrictEqual(
    ['tabs', 'links'],
  );
  expect(shareOptionsOf('exercises').features.map((f) => f.key)).toStrictEqual([
    'tabs',
    'links',
    'list',
    'hints',
    'answers',
    'clear',
  ]);
});

test('an untouched link is framed and drops the menu', () => {
  const options = shareOptionsOf('convert');

  expect(defaultShareConfig(options)).toStrictEqual({
    embed: true,
    hidden: ['tabs'],
  });
});
