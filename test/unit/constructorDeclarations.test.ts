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
  ['unnamed generative', 'class C { C(); }', 'C()'],
  ['named generative', 'class C { C.named(); }', 'C.named()'],
  ['explicit new', 'class C { C.new(); }', 'C.new()'],
  ['named const', 'class C { const C.named(); }', 'const C.named()'],
  ['unnamed const', 'class C { const C(); }', 'const C()'],
  ['named factory', 'class C { factory C.named() => D(); }', 'factory C.named()'],
  ['external factory', 'class C { external factory C.named(); }', 'factory C.named()'],
  ['unnamed factory', 'class C { factory C() => D(); }', 'factory C()'],
  ['redirecting factory', 'class C { factory C.named() = D; }', 'factory C.named() = D'],
  ['unnamed redirecting factory', 'class C { factory C() = D; }', 'factory C() = D'],
  ['generic constructor', 'class C<T> { C.named(T value); }', 'C.named(T value)'],
  ['external generative', 'class C { external C.named(); }', 'C.named()'],
  ['enum constructor', 'enum E { value.named(); const E.named(); }', 'const E.named()'],
  ['extension type constructor', 'extension type E(int value) { E.named(int this.value); }', 'E.named(int this.value)'],
  ['explicit const new', 'class C { const C.new(); }', 'const C.new()'],
  ['explicit factory new', 'class C { factory C.new() => D(); }', 'factory C.new()'],
  ['explicit redirecting new', 'class C { factory C.new() = D; }', 'factory C.new() = D'],
] as const;

test.each(cases)('%s parses without errors', (_title, source) => {
  checkConstructor(source);
});

const trivia = [
  ['block', ' /* comment */ '],
  ['line', ' // comment\n'],
  ['documentation block', ' /** documentation */ '],
  ['documentation line', ' /// documentation\n'],
  ['multiple', ' /* first */ // second\n /** third */ /// fourth\n'],
] as const;

for (const [label, comment] of trivia) {
  test.each(cases)(`%s parses with ${label} comments`, (_title, source, declaration) => {
    checkConstructor(source.replace(declaration, declaration.replace('(', `${comment}(`)));
  });
}

test('comments inside a qualified constructor name parse without errors', () => {
  checkConstructor('class C { C /* owner */ . /* qualifier */ named /* parameters */ (); }');
});

test('comments around explicit new parse without errors', () => {
  checkConstructor('class C { C /* owner */ . /* qualifier */ new /* parameters */ (); }');
});

const explicitNewTriviaCases = [
  ['const', 'class C { const C /* owner */ . /* qualifier */ new /* parameters */ (); }'],
  ['factory', 'class C { factory C /* owner */ . /* qualifier */ new /* parameters */ () => D(); }'],
  ['redirecting factory', 'class C { factory C /* owner */ . /* qualifier */ new /* parameters */ () = D; }'],
] as const;

test.each(explicitNewTriviaCases)('%s explicit new retains comments in the qualified name', (_title, source) => {
  checkConstructor(source);
});

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

function checkConstructor(source: string): void {
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  tree.delete();
}
