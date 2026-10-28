import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `callable-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

for (const fixture of ['callableParameterScope', 'fieldCallbackScope', 'callableNameScope', 'bodylessCallableScope']) {
  testCommand(
    `rendered ${fixture} contains parameters and preserves enclosing definitions`,
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
      `test/fixtures/${fixture}.dart`,
    ],
    120_000,
    {
      env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
      check: (output) => {
        if (fixture === 'callableParameterScope') {
          expect(output).toContain(
            "{ <span class='function'>target</span>(); <span class='variable'>callback</span>(1); }"
          );
          expect(output.match(/<span class=['"]function['"]>target<\/span>\(\);/g)).toHaveLength(3);
          expect(output.match(/<span class=['"]function['"]>hidden<\/span>\(\);/g)).toHaveLength(2);
          expect(output.match(/<span class=['"]function['"]>visible<\/span>\(\);/g)).toHaveLength(2);
          expect(output).toContain("<span class='variable'>callback</span>(&#39;value&#39;)(1)");
          expect(output).toContain("{ <span class='function'>T</span>(); }");
          expect(output.match(/<span class=['"]type parameter['"]>T<\/span>/g)).toHaveLength(2);
        } else if (fixture === 'fieldCallbackScope') {
          expect(output.match(/<span class=['"]function['"]>hidden<\/span>\(\);/g)).toHaveLength(5);
          expect(output.match(/<span class=['"]variable['"]>callback<\/span>\(1\)/g)).toHaveLength(3);
          expect(output).toContain("this.<span class='variable'>callback</span>");
          expect(output).toContain("super.<span class='variable'>callback</span>");
        } else if (fixture === 'callableNameScope') {
          expect(output.match(/<span class=['"]function['"]>f<\/span>/g)).toHaveLength(4);
          expect(output.match(/<span class=['"]function['"]>g<\/span>/g)).toHaveLength(2);
          expect(output.match(/<span class=['"]function['"]>nested<\/span>/g)).toHaveLength(3);
          expect(output.match(/<span class=['"]function['"]>target<\/span>\(\);/g)).toHaveLength(2);
          expect(output).not.toContain("class='function call'");
        } else {
          expect(output.match(/<span class=['"]function['"]>target<\/span>\(\);/g)).toHaveLength(3);
          expect(output.match(/<span class=['"]function['"]>externalCall<\/span>/g)).toHaveLength(2);
        }
      },
    }
  );
}
