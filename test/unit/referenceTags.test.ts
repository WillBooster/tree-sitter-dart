import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser, Query } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const cases = [
  {
    source: 'void f(C value) { value..run()..refresh<int>(); }',
    calls: ['run', 'refresh'],
    operators: [],
  },
  {
    source: 'void f(C value) { value..a().b()..c.d()..e?.g<int>()..h<int>(); value?..i(); }',
    calls: ['a', 'b', 'd', 'g', 'h', 'i'],
    operators: [],
  },
  {
    source: 'void f() { accept(.create()); accept(.create<int>()); }',
    calls: ['accept', 'create', 'accept', 'create'],
    operators: [],
  },
  {
    source: 'void f(C value, C? nullable) { foo<int>(1); value.bar<int>(1); nullable?.bar<int>(1); C.qux<int>(1); }',
    calls: ['foo', 'bar', 'bar', 'qux'],
    operators: [],
  },
  {
    source:
      'void f(C value, C? nullable) { final first = foo<int>; final second = value.bar<int>; final third = (nullable?.bar)!<int>; final fourth = C.qux<int>; }',
    calls: [],
    operators: [],
  },
  {
    source: 'class C { C operator +(C other) => this; bool operator <=(C other) => true; }',
    calls: [],
    operators: ['+', '<='],
  },
  {
    source: 'void f(C value) { final first = .create; value..run; final second = value.run; }',
    calls: [],
    operators: [],
  },
];

test.each(cases)('tags callable names in $source', async ({ source, calls, operators }) => {
  await Parser.init();
  const language = await Language.load(path.join(root, 'tree-sitter-dart.wasm'));
  const parser = new Parser();
  let query: Query | undefined;
  try {
    parser.setLanguage(language);
    query = new Query(language, fs.readFileSync(path.join(root, 'queries/tags.scm'), 'utf8'));
    const tree = parser.parse(source)!;
    try {
      expect(tree.rootNode.hasError).toBe(false);
      const matches = query.matches(tree.rootNode);
      for (const [kind, expected] of [
        ['reference.call', calls],
        ['definition.method', operators],
      ] as const) {
        const names = matches
          .filter(({ captures }) => captures.some(({ name }) => name === kind))
          .map(({ captures }) => captures.find(({ name }) => name === 'name')?.node)
          .toSorted((left, right) => (left?.startIndex ?? 0) - (right?.startIndex ?? 0))
          .map((node) => node?.text);
        expect(names).toEqual(expected);
      }
    } finally {
      tree.delete();
    }
  } finally {
    query?.delete();
    parser.delete();
  }
});
