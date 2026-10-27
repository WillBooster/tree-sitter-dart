import path from 'node:path';

import { Edit, Language, Parser, type Tree } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

let parser: Parser | undefined;
let coldParser: Parser | undefined;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
  coldParser = new Parser();
  coldParser.setLanguage(language);
});

afterAll(() => {
  coldParser?.delete();
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

const edits = [
  { before: 'void f(){sink(a < b,c > -x);}', after: 'void f(){sink(a < b,c > (x));}' },
  { before: 'void f(){sink(a < b,c > /*trivia*/-x);}', after: 'void f(){sink(a < b,c > /*trivia*/(x));}' },
  { before: 'void f(){var value=id<int>/*trivia*/;}', after: 'void f(){var value=id<int>/*trivia*/-x;}' },
  { before: 'void f(){var value=id<int>/*trivia*/;}', after: 'void f(){var value=id<int>/*unclosed;}' },
];

test.each(edits)('incrementally reparses a changed lookahead: $after', ({ before, after }) => {
  let tree = parser!.parse(before)!;
  try {
    tree = editAndCompare(before, after, tree);
    tree = editAndCompare(after, before, tree);
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
  } finally {
    tree.delete();
  }
});

function editAndCompare(before: string, after: string, tree: Tree): Tree {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  tree.edit(
    new Edit({
      startIndex: start,
      oldEndIndex: oldEnd,
      newEndIndex: newEnd,
      startPosition: position(before, start),
      oldEndPosition: position(before, oldEnd),
      newEndPosition: position(after, newEnd),
    })
  );
  const incremental = parser!.parse(after, tree)!;
  const fresh = coldParser!.parse(after)!;
  try {
    expect(incremental.rootNode.toString()).toBe(fresh.rootNode.toString());
    tree.delete();
    return incremental;
  } catch (error) {
    incremental.delete();
    throw error;
  } finally {
    fresh.delete();
  }
}

function position(source: string, index: number): { row: number; column: number } {
  const rows = source.slice(0, index).split('\n');
  return { row: rows.length - 1, column: rows.at(-1)!.length };
}
