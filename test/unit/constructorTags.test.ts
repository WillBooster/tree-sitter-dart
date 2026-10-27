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
  ['explicit const new', 'class C { const C.new(); }', 'constant_constructor_signature', 'const C.new()', 'C'],
  [
    'explicit factory new',
    'class C { factory C.new() => D(); }',
    'factory_constructor_signature',
    'factory C.new()',
    'C',
  ],
  [
    'explicit redirecting new',
    'class C { factory C.new() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C.new() = D',
    'C',
  ],
] as const;

test.each(cases)('%s has one constructor tag with its semantic name', (_title, source, kind, declaration, name) => {
  checkConstructorTag(source, kind, declaration, name);
});

const trivia = [
  ['block', ' /* comment */ '],
  ['line', ' // comment\n'],
  ['documentation block', ' /** documentation */ '],
  ['documentation line', ' /// documentation\n'],
  ['multiple', ' /* first */ // second\n /** third */ /// fourth\n'],
] as const;

for (const [label, comment] of trivia) {
  test.each(cases)(`%s retains one tag with ${label} comments`, (_title, source, kind, declaration, name) => {
    const commented = declaration.replace('(', `${comment}(`);
    checkConstructorTag(source.replace(declaration, commented), kind, commented, name);
  });
}

test('comments inside a qualified constructor name do not capture the class prefix', () => {
  checkConstructorTag(
    'class C { C /* owner */ . /* qualifier */ named /* parameters */ (); }',
    'constructor_signature',
    'C /* owner */ . /* qualifier */ named /* parameters */ ()',
    'named'
  );
});

test('comments around explicit new retain the unnamed constructor identity', () => {
  checkConstructorTag(
    'class C { C /* owner */ . /* qualifier */ new /* parameters */ (); }',
    'constructor_signature',
    'C /* owner */ . /* qualifier */ new /* parameters */ ()',
    'C'
  );
});

const explicitNewTriviaCases = [
  [
    'const',
    'class C { const C /* owner */ . /* qualifier */ new /* parameters */ (); }',
    'constant_constructor_signature',
    'const C /* owner */ . /* qualifier */ new /* parameters */ ()',
  ],
  [
    'factory',
    'class C { factory C /* owner */ . /* qualifier */ new /* parameters */ () => D(); }',
    'factory_constructor_signature',
    'factory C /* owner */ . /* qualifier */ new /* parameters */ ()',
  ],
  [
    'redirecting factory',
    'class C { factory C /* owner */ . /* qualifier */ new /* parameters */ () = D; }',
    'redirecting_factory_constructor_signature',
    'factory C /* owner */ . /* qualifier */ new /* parameters */ () = D',
  ],
] as const;

test.each(explicitNewTriviaCases)(
  '%s explicit new retains comments in the qualified name',
  (_title, source, kind, definition) => {
    checkConstructorTag(source, kind, definition, 'C');
  }
);

test('constructor-name edits preserve raw capture pairing and the following declaration', () => {
  const source = 'class C { C(); }\nvoid following() {}';
  checkInsertion(source, source.indexOf('C()') + 1, '.named');
});

test('comment insertion preserves raw capture pairing and the following declaration', () => {
  const source = 'class C { C.named(); }\nvoid following() {}';
  checkInsertion(source, source.indexOf('named') + 'named'.length, ' /* comment */ ');
});

function checkInsertion(original: string, startIndex: number, inserted: string): void {
  const old = parser.parse(original)!;
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
  const matches = query.matches(incremental.rootNode);
  const methods = matches.filter((match) => match.captures.some((capture) => capture.name === 'definition.method'));
  expect(methods).toHaveLength(1);
  expect(methods[0]!.captures.find((capture) => capture.name === 'name')!.node.text).toBe('named');
  expect(matches.map((match) => match.captures.map(captureRecord))).toEqual(
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
}

function checkConstructorTag(source: string, kind: string, declaration: string, name: string): void {
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
}

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
