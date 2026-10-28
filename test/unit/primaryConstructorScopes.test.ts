import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `primary-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

for (const fixture of [
  'primaryParameterScope',
  'primaryFieldScope',
  'primaryGenericFieldScope',
  'primaryFactoryScope',
  'primaryStaticScope',
  'primaryLateScope',
]) {
  testCommand(
    `rendered ${fixture} preserves primary parameter and field visibility`,
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
        if (fixture === 'primaryParameterScope') {
          expect(output).toContain(
            "stored = <span class='variable'>target</span>() { <span class='variable'>target</span>(); }"
          );
          expect(output.match(/<span class='function'>target<\/span>\(\);/g)).toHaveLength(2);
          expect(output.match(/<span class='variable'>target<\/span>\(\);/g)).toHaveLength(4);
        } else if (fixture === 'primaryFieldScope') {
          for (const name of ['staticValue', 'lateValue', 'covariantLate']) {
            expect(output).toContain(`<span class='variable'>${name}</span>=<span class='function'>target</span>()`);
          }
          for (const name of ['direct', 'regular']) {
            expect(output).toContain(`<span class='variable'>${name}</span>=<span class='variable'>target</span>()`);
          }
          expect(output).toContain("=&gt;2;return <span class='function'>target</span>();");
          expect(output.match(/<span class='variable'>target<\/span>\([123]\)/g)).toHaveLength(6);
        } else if (fixture === 'primaryGenericFieldScope') {
          expect(output.match(/<span class='variable'>callback<\/span>\([123]\)/g)).toHaveLength(6);
          expect(output.match(/<span class='function'>T<\/span>\(\);/g)).toHaveLength(5);
          expect(output.match(/<span class='function'>U<\/span>\(\);/g)).toHaveLength(1);
          expect(output.match(/<span class='type parameter'>T<\/span>/g)).toHaveLength(8);
          expect(output.match(/<span class='type parameter'>U<\/span>/g)).toHaveLength(2);
        } else if (fixture === 'primaryFactoryScope') {
          expect(output.match(/<span class='function'>target<\/span>\(\)/g)).toHaveLength(4);
        } else if (fixture === 'primaryStaticScope') {
          expect(output).toContain("value</span>=<span class='function'>target</span>()");
          expect(output).toContain("stored</span>=<span class='variable'>target</span>");
        } else {
          expect(output).toContain("value</span>=<span class='function'>target</span>()");
        }
      },
    }
  );
}
