import path from 'node:path';

import { Language, Parser, type Tree } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

let parser: Parser | undefined;

const recordCases = [
  '@override/*x*/(int,int) f()=>(1,2);',
  '@override/**doc*/(int,int) f()=>(1,2);',
  '@override/*outer/*inner*/end*/(int,int) f()=>(1,2);',
  '@override/*a\0b*/(int,int) f()=>(1,2);',
  '@override/*x*/ ({int x,int y}) f()=>(x:1,y:2);',
  '@override/*x*/() f()=>();',
  '@A(1) (int,int) f()=>(1,2);',
  '@v/*x*/(int,int) f()=>(1,2);\n@AAAAAA(1) int g()=>1;',
];

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
});

afterAll(() => {
  parser?.delete();
});

test.each(recordCases)('retains an annotated record return in %j', (source) => {
  const tree = parser!.parse(source)!;
  try {
    expectRecordReturn(tree);
    const expectedArguments = source.includes('(1)') ? 1 : 0;
    expect(tree.rootNode.descendantsOfType('annotation_arguments')).toHaveLength(expectedArguments);
  } finally {
    tree.delete();
  }
});

test.each([
  "@p.Deprecated('x') class C{}",
  "@p /*x*/ . Deprecated('x') class C{}",
  '@A<int>(1) class C{}',
  '@A <int>(1) class C{}',
  '@A/*x*/<int>(1) class C{}',
  '@A(1)/*x*/(int,int) f()=>(1,2);',
  "@p.Deprecated('x') (int,int) f()=>(1,2);",
])('preserves qualified and generic annotation arguments in %j', (source) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    expect(tree.rootNode.descendantsOfType('annotation_arguments')).toHaveLength(1);
  } finally {
    tree.delete();
  }
});

test('rejects comment-separated annotation arguments on a class', () => {
  const tree = parser!.parse('@A/*x*/(1) class C{}')!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(true);
  } finally {
    tree.delete();
  }
});

test('retains a later annotation while recovering from malformed metadata', () => {
  const tree = parser!.parse('enum E {\n  @A/*x*/(1),\n}\n\n@MyAnnota(1)\nint x = 0;')!;
  try {
    const annotation = tree.rootNode
      .descendantsOfType('annotation')
      .find((node) => node.childForFieldName('name')?.text === 'MyAnnota')!;
    expect(annotation.descendantsOfType('annotation_arguments').map((node) => node.text)).toEqual(['(1)']);
  } finally {
    tree.delete();
  }
});

function expectRecordReturn(tree: Tree): void {
  expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
  const signature = tree.rootNode
    .descendantsOfType('function_signature')
    .find((node) => node.childForFieldName('name')?.text === 'f')!;
  expect(signature.childForFieldName('return_type')?.descendantsOfType('record_type')).toHaveLength(1);
}
