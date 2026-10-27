import fs from 'node:fs';
import path from 'node:path';

import { Edit, Language, type Node, Parser, Query, type QueryCapture } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const emptyConstants = ['const []', 'const {}', 'const <int>[]', 'const <int>{}', 'const <int, int>{}'];
let parser: Parser;
let queries: Query[];

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser().setLanguage(language);
  queries = ['tags', 'highlights', 'locals'].map(
    (name) => new Query(language, fs.readFileSync(path.join(repositoryRoot, `queries/${name}.scm`), 'utf8'))
  );
});

afterAll(() => {
  for (const query of queries) query.delete();
  parser.delete();
});

for (const pattern of emptyConstants) {
  test(`${pattern} is a constant in a switch expression`, () => {
    checkConstant(`int f(Object value) => switch (value) { ${pattern} => 1, _ => 0 };`, pattern);
  });
  test(`${pattern} is a constant in a switch statement`, () => {
    checkConstant(`void f(Object value) { switch (value) { case ${pattern}: break; default: break; } }`, pattern);
  });
  test(`${pattern} is a constant in an if-case`, () => {
    checkConstant(`void f(Object value) { if (value case ${pattern}) { print(value); } }`, pattern);
  });
}

test('a nested list constant retains its enclosing structural pattern', () => {
  checkConstant('void f(Object value) { if (value case [const []]) {} }', 'const []', 'list_pattern');
});

test('a nested map constant retains its enclosing structural pattern', () => {
  checkConstant("void f(Object value) { if (value case {'k': const {}}) {} }", 'const {}', 'map_pattern');
});

test.each(['const [1]', 'const {1: 2}', 'const <int>[1]', 'const <int>{1}', 'const <int, int>{1: 2}'])(
  '%s remains a nonempty constant pattern',
  (pattern) => checkConstant(`void f(Object value) { if (value case ${pattern}) {} }`, pattern)
);

test.each(['const [,]', 'const {,}', 'const <int>[,]', 'const <int>{,}', 'const <int, int>{:}'])(
  '%s remains malformed and recovers the next declaration',
  (pattern) => {
    const tree = parser.parse(`void f(Object value) { if (value case ${pattern}) {} }\nvoid following() {}`)!;
    expect(tree.rootNode.hasError).toBe(true);
    checkFollowing(tree.rootNode);
    tree.delete();
  }
);

const edits = [
  ['[]', 'const []'],
  ['const [1]', 'const []'],
  ['const <int>[1]', 'const <int>[]'],
  ['const <int, int>{1: 2}', 'const <int, int>{}'],
] as const;

test.each(edits)('editing %s to %s preserves pattern kind, fields, ranges and captures', (before, after) => {
  const source = `void f(Object value) { if (value case ${before}) {} }\nvoid following() {}`;
  const startIndex = source.indexOf(before);
  const updated = source.slice(0, startIndex) + after + source.slice(startIndex + before.length);
  const old = parser.parse(source)!;
  old.edit(
    new Edit({
      startIndex,
      oldEndIndex: startIndex + before.length,
      newEndIndex: startIndex + after.length,
      startPosition: { row: 0, column: startIndex },
      oldEndPosition: { row: 0, column: startIndex + before.length },
      newEndPosition: { row: 0, column: startIndex + after.length },
    })
  );
  const incremental = parser.parse(updated, old)!;
  const fresh = parser.parse(updated)!;
  expect(incremental.rootNode.hasError).toBe(false);
  expect(incremental.rootNode.descendantsOfType('constant_pattern').map((node) => node.text)).toEqual([after]);
  expect(nodeRecord(incremental.rootNode)).toEqual(nodeRecord(fresh.rootNode));
  for (const query of queries) {
    expect(query.matches(incremental.rootNode).map((match) => match.captures.map(captureRecord))).toEqual(
      query.matches(fresh.rootNode).map((match) => match.captures.map(captureRecord))
    );
    expect(query.captures(incremental.rootNode).map(captureRecord)).toEqual(
      query.captures(fresh.rootNode).map(captureRecord)
    );
  }
  checkFollowing(incremental.rootNode);
  fresh.delete();
  incremental.delete();
  old.delete();
});

function checkConstant(source: string, pattern: string, enclosingKind?: string): void {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const constants = tree.rootNode
    .descendantsOfType('constant_pattern')
    .filter((node) => node.startIndex === source.indexOf(pattern));
  expect(constants).toHaveLength(1);
  const constant = constants[0]!;
  expect(constant.text).toBe(pattern);
  expect(constant.startIndex).toBe(source.indexOf(pattern));
  expect(constant.endIndex).toBe(source.indexOf(pattern) + pattern.length);
  if (enclosingKind) expect(tree.rootNode.descendantsOfType(enclosingKind)).toHaveLength(1);
  for (const query of queries) query.captures(tree.rootNode);
  tree.delete();
}

function checkFollowing(root: Node): void {
  const declaration = root.namedChildren.at(-1)!;
  expect(declaration.type).toBe('function_declaration');
  expect(declaration.childForFieldName('signature')!.childForFieldName('name')!.text).toBe('following');
}

function nodeRecord(node: Node): unknown[] {
  return [
    node.type,
    node.isNamed,
    node.isMissing,
    node.startIndex,
    node.endIndex,
    node.children.map((child, index) => [node.fieldNameForChild(index), nodeRecord(child)]),
  ];
}

function captureRecord(capture: QueryCapture): unknown[] {
  return [
    capture.patternIndex,
    capture.name,
    capture.node.type,
    capture.node.text,
    capture.node.startIndex,
    capture.node.endIndex,
  ];
}
