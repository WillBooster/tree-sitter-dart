import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `wildcard-scopes-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

for (const fixture of ['wildcardLocals', 'wildcardLocalFunctions', 'wildcardTypeParameters', 'wildcardExternalNames']) {
  testCommand(
    `rendered ${fixture} preserves non-binding wildcard lookup and declaration roles`,
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
      'test/fixtures/forwardTypeHighlightConfig.json',
      `test/fixtures/${fixture}.dart`,
    ],
    120_000,
    {
      env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
      check: (html) => {
        if (fixture === 'wildcardLocals') {
          expect(html.match(/<span class='function'>_<\/span>\(\)/g)).toHaveLength(18);
          expect(html.match(/<span class='variable'>_<\/span>\(\)/g)).toHaveLength(3);
          expect(html.match(/super\.<span class='variable'>_<\/span>/g)).toHaveLength(3);
          expect(html).toContain("var <span class='variable'>_</span> = 9;");
          expect(html.match(/<span class='type parameter'>_<\/span>/g)).toHaveLength(1);
          expect(html.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(3);
        } else if (fixture === 'wildcardLocalFunctions') {
          expect(html.match(/<span class='variable'>_<\/span>\(\)/g)).toHaveLength(3);
          expect(html.match(/<span class='function'>_<\/span>\(\)/g)).toHaveLength(4);
        } else if (fixture === 'wildcardTypeParameters') {
          expect(html.match(/<span class='type parameter'>_<\/span>/g)).toHaveLength(2);
          expect(html.match(/<span class='type definition'>_<\/span>/g)).toHaveLength(4);
          expect(html.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(3);
          expect(html.match(/<span class='type parameter'>U<\/span>/g)).toHaveLength(3);
          for (const name of ['T', 'U']) {
            expect(html).toContain(`<span class='function'>${name}</span>();`);
          }
        } else {
          expect(html.match(/<span class='function'>_<\/span>\(\)/g)).toHaveLength(2);
        }
      },
    }
  );
}
