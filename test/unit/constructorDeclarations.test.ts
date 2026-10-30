import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
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
  ['unnamed generative', 'class C { C(); }', 'constructor_signature', 'C()'],
  ['named generative', 'class C { C.named(); }', 'constructor_signature', 'C.named()'],
  ['explicit new', 'class C { C.new(); }', 'constructor_signature', 'C.new()'],
  ['named const', 'class C { const C.named(); }', 'constant_constructor_signature', 'const C.named()'],
  ['unnamed const', 'class C { const C(); }', 'constant_constructor_signature', 'const C()'],
  ['named factory', 'class C { factory C.named() => D(); }', 'factory_constructor_signature', 'factory C.named()'],
  ['external factory', 'class C { external factory C.named(); }', 'factory_constructor_signature', 'factory C.named()'],
  ['unnamed factory', 'class C { factory C() => D(); }', 'factory_constructor_signature', 'factory C()'],
  [
    'redirecting factory',
    'class C { factory C.named() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C.named() = D',
  ],
  [
    'unnamed redirecting factory',
    'class C { factory C() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C() = D',
  ],
  ['generic constructor', 'class C<T> { C.named(T value); }', 'constructor_signature', 'C.named(T value)'],
  ['external generative', 'class C { external C.named(); }', 'constructor_signature', 'C.named()'],
  [
    'enum constructor',
    'enum E { value.named(); const E.named(); }',
    'constant_constructor_signature',
    'const E.named()',
  ],
  [
    'extension type constructor',
    'extension type E(int value) { E.named(int this.value); }',
    'constructor_signature',
    'E.named(int this.value)',
  ],
  ['explicit const new', 'class C { const C.new(); }', 'constant_constructor_signature', 'const C.new()'],
  ['explicit factory new', 'class C { factory C.new() => D(); }', 'factory_constructor_signature', 'factory C.new()'],
  [
    'explicit redirecting new',
    'class C { factory C.new() = D; }',
    'redirecting_factory_constructor_signature',
    'factory C.new() = D',
  ],
] as const;

test.each(cases)(
  '%s exposes one constructor signature spanning its declaration',
  (_title, source, kind, declaration) => {
    checkConstructor(source, kind, declaration);
  }
);

const trivia = [
  ['block', ' /* comment */ '],
  ['line', ' // comment\n'],
  ['documentation block', ' /** documentation */ '],
  ['documentation line', ' /// documentation\n'],
  ['multiple', ' /* first */ // second\n /** third */ /// fourth\n'],
] as const;

for (const [label, comment] of trivia) {
  test.each(cases)(`%s retains its signature with ${label} comments`, (_title, source, kind, declaration) => {
    const commented = declaration.replace('(', `${comment}(`);
    checkConstructor(source.replace(declaration, commented), kind, commented);
  });
}

test('comments inside a qualified constructor name stay in its signature', () => {
  checkConstructor(
    'class C { C /* owner */ . /* qualifier */ named /* parameters */ (); }',
    'constructor_signature',
    'C /* owner */ . /* qualifier */ named /* parameters */ ()'
  );
});

test('comments around explicit new stay in its signature', () => {
  checkConstructor(
    'class C { C /* owner */ . /* qualifier */ new /* parameters */ (); }',
    'constructor_signature',
    'C /* owner */ . /* qualifier */ new /* parameters */ ()'
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
    checkConstructor(source, kind, definition);
  }
);

test.each(['class C { C.named(); }', 'class C { C.named /* comment */ (); }'])(
  '%s keeps the following declaration',
  (declaration) => {
    const tree = parser.parse(`${declaration}\nvoid following() {}`)!;
    expect(tree.rootNode.hasError).toBe(false);
    expect(tree.rootNode.namedChildren[1]!.childForFieldName('signature')!.childForFieldName('name')!.text).toBe(
      'following'
    );
    tree.delete();
  }
);

function checkConstructor(source: string, kind: string, declaration: string): void {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  expect(tree.rootNode.descendantsOfType(kind).map((node) => node.text)).toEqual([declaration]);
  tree.delete();
}
