import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `switch-pattern-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'switch expression bindings stay inside their guarded and nested arms',
  [
    'script/tree-sitter',
    'highlight',
    '--grammar-path',
    '.',
    '--html',
    '--layout',
    'fragment',
    '--style',
    'minimal',
    '--config-path',
    'test/fixtures/callableHighlightConfig.json',
    'test/fixtures/switchPatternScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      const expected = [
        ['variable', 'variable', 'variable', 'function', 'function'],
        ['variable', 'variable', 'variable', 'function', 'function'],
        ['variable', 'variable', 'variable', 'variable', 'function', 'function'],
        ['variable', 'variable', 'variable', 'variable', 'variable', 'variable', 'function', 'function', 'function'],
      ];
      const lines = output.split('\n').filter((line) => line.includes('=switch'));
      expect(lines).toHaveLength(expected.length);
      for (const [index, line] of lines.entries()) {
        const styles = [...line.matchAll(/<span class='([^']+)'>(target|other)<\/span>/g)].map((match) => match[1]);
        expect(styles).toEqual(expected[index]);
      }
    },
  }
);
