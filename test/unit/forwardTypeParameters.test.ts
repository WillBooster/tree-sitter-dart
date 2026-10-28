import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `forward-types-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

for (const fixture of ['forwardTypeParameters', 'forwardAliasTypes', 'forwardCallbackTypes']) {
  testCommand(
    `rendered ${fixture} resolves lexical types before declaration and preserves enclosing bindings`,
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
      check: (output) => {
        if (fixture === 'forwardTypeParameters') {
          expect(output.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(15);
          expect(output.match(/<span class='function'>T<\/span>/g)).toHaveLength(5);
          expect(output.match(/<span class='type parameter'>U<\/span>/g)).toHaveLength(5);
          expect(output.match(/<span class='function'>U<\/span>/g)).toHaveLength(3);
        } else if (fixture === 'forwardAliasTypes') {
          expect(output.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(6);
          expect(output.match(/<span class='function'>T<\/span>/g)).toHaveLength(1);
          expect([...output.matchAll(/<span class='([^']+)'>Alias<\/span>/g)].map((match) => match[1])).toEqual([
            'type definition',
            'type parameter',
            'type parameter',
          ]);
        } else {
          expect(output.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(12);
          expect(output.match(/<span class='function'>T<\/span>/g)).toHaveLength(7);
          expect(output.match(/<span class='variable'>callback<\/span>\([12]\)/g)).toHaveLength(4);
        }
      },
    }
  );
}
