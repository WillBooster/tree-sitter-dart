import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

let parser: Parser | undefined;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
});

afterAll(() => {
  parser?.delete();
});

const separators = ['', ' ', '/*trivia*/', '/*outer/*inner*/end*/', '//trivia\n', '//trivia\r', '/*a\0b*/'];
const comparisons = separators.map((separator) => `void f(){sink(a < b,c >${separator}-x);}`);
comparisons.push('void f(){sink(a < b,c > [x][0]);}');

test.each(comparisons)('retains two relational arguments in %j', (source) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const argumentsNode = tree.rootNode
      .descendantsOfType('call_expression')
      .find((node) => node.childForFieldName('function')?.text === 'sink')!
      .childForFieldName('arguments')!;
    expect(argumentsNode.namedChildren.filter((node) => !node.isExtra).map((node) => node.type)).toEqual([
      'relational_expression',
      'relational_expression',
    ]);
  } finally {
    tree.delete();
  }
});

const instantiations = [
  { value: 'id<int>(1)', arguments: ['<int>'] },
  { value: 'id<int>.call(1)', arguments: ['<int>'] },
  { value: 'id<int> == id<int>', arguments: ['<int>', '<int>'] },
  { value: 'id<int>/*trivia*/==id<int>', arguments: ['<int>', '<int>'] },
  { value: 'id<List<int>> == id<List<int>>', arguments: ['<List<int>>', '<List<int>>'] },
  { value: 'id<int>!=id<int>', arguments: ['<int>', '<int>'] },
  { value: '(id<int>)..toString()', arguments: ['<int>'] },
  { value: '[id<int>]', arguments: ['<int>'] },
  { value: "{'key':id<int>}", arguments: ['<int>'] },
  { value: 'true ? id<int> : id<num>', arguments: ['<int>', '<num>'] },
  { value: '(id<int>,id<num>)', arguments: ['<int>', '<num>'] },
  { value: 'id<int> /*trivia*/', arguments: ['<int>'] },
  { value: 'id<int> //trivia\r', arguments: ['<int>'] },
];

test.each(instantiations)('retains instantiation fields for $value', ({ value, arguments: expected }) => {
  const tree = parser!.parse(`void f(){var value=${value};}`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const nodes = tree.rootNode.descendantsOfType('instantiation_expression');
    expect(nodes.map((node) => node.childForFieldName('function')?.text)).toEqual(expected.map(() => 'id'));
    expect(nodes.map((node) => node.childForFieldName('type_arguments')?.type)).toEqual(
      expected.map(() => 'type_arguments')
    );
    expect(nodes.map((node) => node.childForFieldName('type_arguments')?.text)).toEqual(expected);
  } finally {
    tree.delete();
  }
});

test.each(['id<int>!', 'id<int>..toString()', 'id<int>==id<int>', 'id<List<int>>==id<List<int>>'])(
  'rejects an unparenthesized instantiation before %s',
  (value) => {
    const tree = parser!.parse(`void f(){var value=${value};}`)!;
    try {
      expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(true);
    } finally {
      tree.delete();
    }
  }
);

test.each([
  'void f(){sink(a < b,c > -x);}',
  'void f(){sink(a < b,c > /*trivia*/-x);}',
  'void f(){var value=id<int>/*trivia*/;}',
])('parses a lookahead after type arguments without errors in %j', (source) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
  } finally {
    tree.delete();
  }
});
