import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const sources = [
  'void f(C value) { value..run()..refresh<int>(); }',
  'void f(C value) { value..a().b()..c.d()..e?.g<int>()..h<int>(); value?..i(); }',
  'void f() { accept(.create()); accept(.create<int>()); }',
  'void f(C value, C? nullable) { foo<int>(1); value.bar<int>(1); nullable?.bar<int>(1); C.qux<int>(1); }',
  'void f(C value, C? nullable) { final first = foo<int>; final second = value.bar<int>; final third = (nullable?.bar)!<int>; final fourth = C.qux<int>; }',
  'class C { C operator +(C other) => this; bool operator <=(C other) => true; }',
  'void f(C value) { final first = .create; value..run; final second = value.run; }',
];

test.each(sources)('parses callable names in %s', async (source) => {
  await Parser.init();
  const language = await Language.load(path.join(root, 'tree-sitter-dart.wasm'));
  const parser = new Parser();
  try {
    parser.setLanguage(language);
    const tree = parser.parse(source)!;
    try {
      expect(tree.rootNode.hasError).toBe(false);
    } finally {
      tree.delete();
    }
  } finally {
    parser.delete();
  }
});
