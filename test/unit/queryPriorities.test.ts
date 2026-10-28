import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, expect } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `query-priorities-${randomUUID()}`);

afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'rendered highlights preserve syntax roles and constructor parameter boundaries',
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
    'test/fixtures/queryPriorityTheme.json',
    'test/fixtures/queryPriorityScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      expect(output).toContain("<span class='attribute'>@</span><span class='attribute'>A</span>");
      expect(output).toContain("<span class='keyword operator'>is</span>");
      expect(output).toContain("<span class='keyword operator'>as</span>");
      expect(output).toContain("<span class='punctuation special'>{</span>");
      expect(output).toContain("<span class='punctuation special'>}</span>");
      expect(output).toContain("object.<span class='property'>field</span>");
      expect(output).toContain("object..<span class='property'>field</span>");
      expect(output).toContain("<span class='constructor'>A</span>");
      expect(output).toContain("<span class='constructor'>C</span>");
      expect(output).toContain("<span class='attribute'>marker</span>");
      expect(output).toContain("<span class='attribute'>core</span>.<span class='attribute'>Deprecated</span>");
      expect(output).toContain("<span class='attribute'>named</span>");
      expect(output).toContain(
        "<span class='variable parameter'>callback</span>:<span class='variable'>callback</span>"
      );
      expect(output.match(/<span class=['"]function['"]>bare<\/span>/g)).toHaveLength(7);
      expect(output).toContain("<span class='function'>newly</span>");
      expect(output).toContain("<span class='constructor'>Abstract</span>");
      expect(output).toContain("<span class='constructor'>Wrapped</span>");
      const lines = output.split('\n');
      const body = lines.find(
        (line) =>
          line.includes("<span class='constructor'>C</span>") &&
          line.includes("<span class='keyword'>factory</span>") === false &&
          line.includes('target')
      )!;
      expect(body).toContain(
        "<span class='variable parameter'>target</span><span class='punctuation bracket'>(</span>"
      );
      const named = lines.find(
        (line) => line.includes("<span class='constructor'>named</span>") && line.includes('target')
      )!;
      expect(named).toContain(
        "<span class='variable parameter'>target</span><span class='punctuation bracket'>(</span>"
      );
      const factory = lines.find((line) => line.includes("<span class='constructor'>created</span>"))!;
      expect(factory).toContain(
        "<span class='variable parameter'>target</span><span class='punctuation bracket'>(</span>"
      );
      expect(output).toContain("maybe?.<span class='property'>field</span>");
      expect(output).toContain("maybe?..<span class='property'>field</span>");
      expect(output).toContain("<span class='variable parameter'>field</span>:field");
      expect(output).toContain("object.<span class='function call'>unrelated</span>");
      expect(
        lines.filter((line) => line.includes('core')).some((line) => line.includes("<span class='keyword'>as</span>"))
      ).toBe(true);
      const adjacent = lines.find((line) => line.includes("<span class='type'>Adjacent</span>"))!;
      expect(adjacent).toContain("<span class='function'>target</span><span class='punctuation bracket'>(</span>");
      const explicit = lines.find((line) => line.includes("<span class='type'>Explicit</span>"))!;
      expect(explicit).toContain("<span class='keyword'>new</span> <span class='constructor'>named</span>");
      expect(explicit).toContain("<span class='function'>newly</span>");
      expect(output).not.toContain("<span class='constructor'><span class='function'>");
      expect(output).not.toContain("<span class='property'>index</span>");
      expect(output).toContain("values..<span class='property'>length</span>");
      const unrelated = lines.filter((line) => line.includes("<span class='function'>unrelated</span>"));
      expect(unrelated).toHaveLength(2);
      expect(unrelated[0]).toContain("<span class='function'>value</span>");
      expect(unrelated[1]).toContain("<span class='function'>target</span>");
    },
  }
);
