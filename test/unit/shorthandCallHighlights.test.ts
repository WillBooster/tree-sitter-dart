import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `shorthand-call-highlight-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'shorthand call names stay independent while arguments and later locals retain bindings',
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
    'test/fixtures/genericCallHighlightConfig.json',
    'test/fixtures/shorthandCallHighlight.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      expect(output).toContain(
        ".<span class='function method call'>create</span>&lt;int&gt;(<span class='variable'>create</span>())"
      );
      expect(output).toContain(
        ".<span class='function method call'>create</span>(<span class='variable'>field</span>())"
      );
      expect(output).toContain("<span class='function'>accept</span>(.field)");
      expect(output).toContain("<span class='variable'>create</span>();<span class='variable'>field</span>();");
      expect(output.match(/class='function method call'>create<\/span>/g)).toHaveLength(2);
    },
  }
);
