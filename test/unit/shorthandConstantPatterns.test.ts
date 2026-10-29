import fs from 'node:fs';
import path from 'node:path';

import { Language, type Node, Parser, Query } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const constructors = ['const .origin()', 'const .filled(2)', 'const .new(1)', 'const .named(value: 2)'];
let parser: Parser | undefined;
const queries: Query[] = [];

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
  for (const name of ['tags', 'highlights', 'locals']) {
    queries.push(new Query(language, fs.readFileSync(path.join(repositoryRoot, `queries/${name}.scm`), 'utf8')));
  }
});

afterAll(() => {
  for (const query of queries) query.delete();
  parser?.delete();
});

for (const pattern of constructors) {
  test(`${pattern} is a constant in a switch expression`, () => {
    checkPatterns(`int f(Object value) => switch (value) { ${pattern} => 1, _ => 0 };`, [pattern]);
  });
  test(`${pattern} is a constant in a switch statement`, () => {
    checkPatterns(`void f(Object value) { switch (value) { case ${pattern}: break; default: break; } }`, [pattern]);
  });
  test(`${pattern} is a constant in an if-case`, () => {
    checkPatterns(`void f(Object value) { if (value case ${pattern}) { print(value); } }`, [pattern]);
  });
}

test('nested shorthand constants retain their enclosing list and map patterns', () => {
  checkPatterns('void f(Object value) { if (value case [const .origin()]) {} }', ['const .origin()']);
  checkPatterns("void f(Object value) { if (value case {'key': const .filled(2)}) {} }", ['const .filled(2)']);
});

test('logical and guarded shorthand patterns retain complete argument ranges', () => {
  checkPatterns('void f(Object value) { if (value case const .origin() || const .filled(2)) {} }', [
    'const .origin()',
    'const .filled(2)',
  ]);
  checkPatterns('void f(Object value) { if (value case const .origin() when value != null) {} }', ['const .origin()']);
});

for (const pattern of ['.red', '.new']) {
  test(`${pattern} retains its identifier child in a switch expression`, () => {
    checkPatterns(`int f(Object value) => switch (value) { ${pattern} => 1, _ => 0 };`, [pattern]);
  });
  test(`${pattern} retains its identifier child in a switch statement`, () => {
    checkPatterns(`void f(Object value) { switch (value) { case ${pattern}: break; default: break; } }`, [pattern]);
  });
  test(`${pattern} retains its identifier child in an if-case`, () => {
    checkPatterns(`void f(Object value) { if (value case ${pattern}) {} }`, [pattern]);
  });
}

test.each(['const .', 'const .named(value:)', 'const .origin(,)', 'const .new(,)', 'const ..origin()'])(
  '%s remains malformed',
  (pattern) => {
    const source = `void f(Object value) { if (value case ${pattern}) {} }\nvoid following() {}`;
    const tree = parser!.parse(source)!;
    expect(tree.rootNode.hasError).toBe(true);
    const start = source.indexOf(pattern);
    expect(hasErrorWithin(tree.rootNode, source.indexOf('case '), start + pattern.length)).toBe(true);
    tree.delete();
  }
);

test.each([
  ['const .origin()', false],
  ['const .filled(3)', false],
  ['const .new(2)', false],
  ['const .origin(,)', true],
] as const)('an if-case on %s keeps the following declaration', (pattern, hasError) => {
  const tree = parser!.parse(`void f(Object value) { if (value case ${pattern}) {} }\nvoid following() {}`)!;
  expect(tree.rootNode.hasError).toBe(hasError);
  expect(tree.rootNode.namedChildren.at(-1)!.childForFieldName('signature')!.childForFieldName('name')!.text).toBe(
    'following'
  );
  tree.delete();
});

function checkPatterns(source: string, patterns: string[]): void {
  const tree = parser!.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  for (const pattern of patterns) {
    const constants = tree.rootNode
      .descendantsOfType('constant_pattern')
      .filter((node) => node.startIndex === source.indexOf(pattern));
    expect(constants).toHaveLength(1);
    const constant = constants[0]!;
    expect(constant.text).toBe(pattern);
    expect(constant.endIndex).toBe(source.indexOf(pattern) + pattern.length);
    if (pattern.startsWith('const ')) {
      expect(constant.descendantsOfType('arguments')).toHaveLength(1);
    } else {
      expect(constant.namedChildren.map((node) => [node.type, node.text])).toEqual([['identifier', pattern.slice(1)]]);
    }
  }
  for (const query of queries) query.captures(tree.rootNode);
  tree.delete();
}

function hasErrorWithin(node: Node, start: number, end: number): boolean {
  return (
    (node.hasError && node.startIndex >= start && node.endIndex <= end) ||
    node.children.some((child) => hasErrorWithin(child, start, end))
  );
}
