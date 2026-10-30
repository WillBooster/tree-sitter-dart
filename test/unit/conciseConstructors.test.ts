import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const constructorKinds = [
  'constructor_signature',
  'constant_constructor_signature',
  'factory_constructor_signature',
  'redirecting_factory_constructor_signature',
];
let parser: Parser;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser().setLanguage(language);
});

afterAll(() => {
  parser.delete();
});

const cases = [
  ['class C { new() {} }', 'constructor_signature', undefined],
  ['class C { new named() {} }', 'constructor_signature', 'named'],
  ['class C { const new(); }', 'constant_constructor_signature', undefined],
  ['class C { const new named(); }', 'constant_constructor_signature', 'named'],
  ['class C { factory() => D(); }', 'factory_constructor_signature', undefined],
  ['class C { factory named() => D(); }', 'factory_constructor_signature', 'named'],
  ['class C { factory() = D; }', 'redirecting_factory_constructor_signature', undefined],
  ['class C { const factory named() = D; }', 'redirecting_factory_constructor_signature', 'named'],
  ['class C { external new(); }', 'constructor_signature', undefined],
  ['class C { external const factory(); }', 'factory_constructor_signature', undefined],
  ['class C { external factory named(); }', 'factory_constructor_signature', 'named'],
  ['enum E { value; const new(); }', 'constant_constructor_signature', undefined],
  ['extension type E(int value) { new named(int this.value); }', 'constructor_signature', 'named'],
  ['class C<T> { new named(T value); }', 'constructor_signature', 'named'],
] as const;

test.each(cases)('%s exposes a constructor signature', (source, kind, name) => {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const signatures = tree.rootNode.descendantsOfType(constructorKinds);
  expect(signatures).toHaveLength(1);
  const signature = signatures[0]!;
  expect(signature.type).toBe(kind);
  expect(signature.childForFieldName('name')?.text).toBe(name);
  expect(signature.childForFieldName('parameters')?.type).toBe('formal_parameter_list');
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
