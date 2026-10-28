import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `catch-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'catch bindings stay in their own handlers through nesting, closures, shadowing, and adjacent code',
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
    'test/fixtures/catchParameterScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      const cases: [string, string, string[]][] = [
        [
          'basic',
          'nested',
          [
            'variable',
            'variable',
            'variable',
            'variable',
            'variable',
            'function',
            'function',
            'variable',
            'function',
            'function',
            'function',
            'function',
            'function',
            'function',
          ],
        ],
        [
          'nested',
          'untyped',
          [
            'variable',
            'variable',
            'variable',
            'variable',
            'variable',
            'variable',
            'function',
            'variable',
            'function',
            'function',
            'function',
          ],
        ],
        ['untyped', 'main', ['variable', 'variable', 'variable', 'function', 'function']],
      ];
      for (const [start, end, expected] of cases) {
        const section = output
          .split(`<span class='function'>${start}</span>`)[1]!
          .split(`<span class='function'>${end}</span>`)[0]!;
        const styles = [...section.matchAll(/<span class='([^']+)'>(target|trace|other)<\/span>/g)].map(
          (match) => match[1]
        );
        expect(styles, start).toEqual(expected);
      }
    },
  }
);
