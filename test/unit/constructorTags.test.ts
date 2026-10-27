import fs from 'node:fs';
import path from 'node:path';

import { Edit, Language, Parser, Query, type QueryCapture } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
let parser: Parser;
let query: Query;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser().setLanguage(language);
  query = new Query(language, fs.readFileSync(path.join(repositoryRoot, 'queries/tags.scm'), 'utf8'));
});

afterAll(() => {
  query.delete();
  parser.delete();
});

const cases = [
  ['unnamed generative', 'class C { C(); }', 'constructor_signature', 'C()', 'C'],
  ['named generative', 'class C { C.named(); }', 'constructor_signature', 'C.named()', 'named'],
  ['explicit new', 'class C { C.new(); }', 'constructor_signature', 'C.new()', 'C'],
  ['named const', 'class C { const C.named(); }', 'constant_constructor_signature', 'const C.named()', 'named'],
  ['unnamed const', 'class C { const C(); }', 'constant_constructor_signature', 'const C()', 'C'],
  [
    'named factory',
    'class C { factory C.named() => D(); }',
    'factory_constructor_signature',
    'factory C.named()',
    'named',
  ],
  [
    'external factory',
    'class C { external factory C.named(); }',
    'factory_constructor_signature',
    'factory C.named()',
    'named',
  ],
  ['unnamed factory', 'class C { factory C() => D(); }', 'factory_constructor_signature', 'factory C()', 'C'],
  [
    'redirecting factory',
    'class C { factory C.named() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C.named() = D',
    'named',
  ],
  [
    'unnamed redirecting factory',
    'class C { factory C() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C() = D',
    'C',
  ],
  ['generic constructor', 'class C<T> { C.named(T value); }', 'constructor_signature', 'C.named(T value)', 'named'],
  ['external generative', 'class C { external C.named(); }', 'constructor_signature', 'C.named()', 'named'],
  [
    'enum constructor',
    'enum E { value.named(); const E.named(); }',
    'constant_constructor_signature',
    'const E.named()',
    'named',
  ],
  [
    'extension type constructor',
    'extension type E(int value) { E.named(int this.value); }',
    'constructor_signature',
    'E.named(int this.value)',
    'named',
  ],
] as const;

test.each(cases)('%s has one constructor tag with its semantic name', (_title, source, kind, declaration, name) => {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const matches = query
    .matches(tree.rootNode)
    .filter((match) =>
      match.captures.some((capture) => capture.name === 'definition.method' && capture.node.type === kind)
    );
  expect(matches).toHaveLength(1);
  const match = matches[0]!;
  const definition = match.captures.find((capture) => capture.name === 'definition.method')!.node;
  const symbol = match.captures.find((capture) => capture.name === 'name')!.node;
  expect(definition.text).toBe(declaration);
  expect(symbol.text).toBe(name);
  expect(definition.startIndex).toBeLessThanOrEqual(symbol.startIndex);
  expect(symbol.endIndex).toBeLessThanOrEqual(definition.endIndex);
  expect(source.slice(symbol.startIndex, symbol.endIndex)).toBe(name);
  const captures = query.captures(tree.rootNode).filter((capture) => capture.patternIndex === match.patternIndex);
  expect(captures.map(captureRecord)).toEqual(match.captures.map(captureRecord));
  expect(captures.map((capture) => capture.name)).toEqual(['definition.method', 'name']);
  tree.delete();
});

test('constructor-name edits preserve raw capture pairing and the following declaration', () => {
  const original = 'class C { C(); }\nvoid following() {}';
  const old = parser.parse(original)!;
  const startIndex = original.indexOf('C()') + 1;
  const inserted = '.named';
  const updated = original.slice(0, startIndex) + inserted + original.slice(startIndex);
  old.edit(
    new Edit({
      startIndex,
      oldEndIndex: startIndex,
      newEndIndex: startIndex + inserted.length,
      startPosition: { row: 0, column: startIndex },
      oldEndPosition: { row: 0, column: startIndex },
      newEndPosition: { row: 0, column: startIndex + inserted.length },
    })
  );
  const incremental = parser.parse(updated, old)!;
  const fresh = parser.parse(updated)!;
  expect(incremental.rootNode.hasError).toBe(false);
  expect(incremental.rootNode.toString()).toBe(fresh.rootNode.toString());
  expect(query.matches(incremental.rootNode).map((match) => match.captures.map(captureRecord))).toEqual(
    query.matches(fresh.rootNode).map((match) => match.captures.map(captureRecord))
  );
  expect(query.captures(incremental.rootNode).map(captureRecord)).toEqual(
    query.captures(fresh.rootNode).map(captureRecord)
  );
  expect(incremental.rootNode.namedChildren[1]!.childForFieldName('signature')!.childForFieldName('name')!.text).toBe(
    'following'
  );
  fresh.delete();
  incremental.delete();
  old.delete();
});

function captureRecord(capture: QueryCapture): [number, string, string, string, number, number] {
  return [
    capture.patternIndex,
    capture.name,
    capture.node.type,
    capture.node.text,
    capture.node.startIndex,
    capture.node.endIndex,
  ];
}
