import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser, Query, type QueryCapture } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const constructorKinds = [
  'constructor_signature',
  'constant_constructor_signature',
  'factory_constructor_signature',
  'redirecting_factory_constructor_signature',
];
let parser: Parser;
let queries: Query[];
let tags: Query;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser().setLanguage(language);
  queries = ['tags', 'highlights', 'locals'].map(
    (name) => new Query(language, fs.readFileSync(path.join(repositoryRoot, `queries/${name}.scm`), 'utf8'))
  );
  tags = queries[0]!;
});

afterAll(() => {
  for (const query of queries) query.delete();
  parser.delete();
});

const cases = [
  ['class C { new() {} }', 'constructor_signature', undefined, 'C'],
  ['class C { new named() {} }', 'constructor_signature', 'named', 'named'],
  ['class C { const new(); }', 'constant_constructor_signature', undefined, 'C'],
  ['class C { const new named(); }', 'constant_constructor_signature', 'named', 'named'],
  ['class C { factory() => D(); }', 'factory_constructor_signature', undefined, 'C'],
  ['class C { factory named() => D(); }', 'factory_constructor_signature', 'named', 'named'],
  ['class C { factory() = D; }', 'redirecting_factory_constructor_signature', undefined, 'C'],
  ['class C { const factory named() = D; }', 'redirecting_factory_constructor_signature', 'named', 'named'],
  ['class C { external new(); }', 'constructor_signature', undefined, 'C'],
  ['class C { external const factory(); }', 'factory_constructor_signature', undefined, 'C'],
  ['class C { external factory named(); }', 'factory_constructor_signature', 'named', 'named'],
  ['enum E { value; const new(); }', 'constant_constructor_signature', undefined, 'E'],
  ['extension type E(int value) { new named(int this.value); }', 'constructor_signature', 'named', 'named'],
  ['class C<T> { new named(T value); }', 'constructor_signature', 'named', 'named'],
] as const;

test.each(cases)('%s exposes a constructor signature and one semantic method tag', (source, kind, name, symbol) => {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const signatures = tree.rootNode.descendantsOfType(constructorKinds);
  expect(signatures).toHaveLength(1);
  const signature = signatures[0]!;
  expect(signature.type).toBe(kind);
  expect(signature.childForFieldName('name')?.text).toBe(name);
  expect(signature.childForFieldName('parameters')?.type).toBe('formal_parameter_list');
  const expectedName =
    signature.childForFieldName('name') ?? tree.rootNode.namedChildren[0]!.childForFieldName('name')!;
  const methods = tags
    .matches(tree.rootNode)
    .filter(
      (match) =>
        match.captures.some((capture) => capture.name === 'definition.method') &&
        match.captures.some((capture) => capture.name === 'name' && capture.node.startIndex === expectedName.startIndex)
    );
  expect(methods).toHaveLength(1);
  const match = methods[0]!;
  const definition = match.captures.find((capture) => capture.name === 'definition.method')!.node;
  const capturedName = match.captures.find((capture) => capture.name === 'name')!.node;
  expect(capturedName.text).toBe(symbol);
  expect(definition.startIndex).toBeLessThanOrEqual(signature.startIndex);
  expect(signature.endIndex).toBeLessThanOrEqual(definition.endIndex);
  expect(definition.startIndex).toBeLessThanOrEqual(capturedName.startIndex);
  expect(capturedName.endIndex).toBeLessThanOrEqual(definition.endIndex);
  expect(source.slice(capturedName.startIndex, capturedName.endIndex)).toBe(symbol);
  expect(
    tags
      .captures(tree.rootNode)
      .filter((capture) => capture.patternIndex === match.patternIndex)
      .map(captureRecord)
  ).toEqual(match.captures.map(captureRecord));
  for (const query of queries) query.captures(tree.rootNode);
  tree.delete();
});

test.each([
  ['class C { new named() {} }', false],
  ['class C { external factory(); }', false],
  ['class C { factory() = D; }', false],
  ['class C { new named /* parameters */ (); }', false],
  ['class C { new named(,); }', true],
] as const)('%s keeps the following declaration', (declaration, hasError) => {
  const tree = parser.parse(`${declaration}\nvoid following() {}`)!;
  expect(tree.rootNode.hasError).toBe(hasError);
  expect(tree.rootNode.namedChildren.at(-1)!.childForFieldName('signature')!.childForFieldName('name')!.text).toBe(
    'following'
  );
  tree.delete();
});

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
