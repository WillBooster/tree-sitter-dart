import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `typedef-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'typedef parameters stay inside legacy modern generic and nested signatures',
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
    'test/fixtures/typedefScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      const main = output.split("<span class='function'>main</span>")[1]!;
      for (const name of ['target', 'cb', 'hidden', 'T']) {
        expect(main).toContain(`<span class='function'>${name}</span>();`);
      }
      expect(output).toContain(
        "Modern&lt;<span class='type parameter'>T</span>&gt; = <span class='type parameter'>T</span> Function(<span class='type parameter'>T</span>"
      );
      expect(output).toContain(
        "List&lt;List&lt;<span class='type parameter'>T</span>&gt;&gt; Deep&lt;<span class='type parameter'>T</span>&gt;(<span class='type parameter'>T</span>"
      );
      expect(output).toContain(
        "typedef <span class='type parameter'>T</span> LegacyGeneric&lt;<span class='type parameter'>T</span>&gt;(<span class='type parameter'>T</span>"
      );
    },
  }
);
