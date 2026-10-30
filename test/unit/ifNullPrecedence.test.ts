import path from 'node:path';

import { Language, type Node, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

import cases from '../fixtures/ifNullPrecedence.json';
import { checkFollowing } from '../helpers/checkFollowing';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const binaryKinds = new Set([
  'if_null_expression',
  'logical_or_expression',
  'logical_and_expression',
  'equality_expression',
  'additive_expression',
]);
let parser: Parser | undefined;

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
});

afterAll(() => {
  parser?.delete();
});

test.each(cases)('$expression has the language-defined grouping', ({ expression, expected }) => {
  const source = `var result = ${expression};\nvoid following() {}`;
  const tree = parser!.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const value = tree.rootNode.descendantsOfType('initialized_identifier')[0]!.namedChildren[1]!;
  expect(group(value)).toEqual(expected);
  expect(value.startIndex).toBe(source.indexOf(expression));
  expect(value.endIndex).toBe(source.indexOf(expression) + expression.length);
  checkFollowing(tree.rootNode);
  tree.delete();
});

test.each(['a ??', 'a ?? ? b : c', 'a ?? b ? : c', 'a ?? b ? c :'])(
  '%s remains malformed and recovers the following declaration',
  (expression) => {
    const tree = parser!.parse(`var result = ${expression};\nvoid following() {}`)!;
    expect(tree.rootNode.hasError).toBe(true);
    checkFollowing(tree.rootNode);
    tree.delete();
  }
);

function group(node: Node): unknown {
  const children = node.namedChildren.filter((child) => child.type !== 'comment');
  if (node.type === 'conditional_expression') {
    return [
      '?:',
      group(children[0]!),
      group(node.childForFieldName('consequence')!),
      group(node.childForFieldName('alternative')!),
    ];
  }
  if (node.type === 'parenthesized_expression') return ['()', group(children[0]!)];
  if (binaryKinds.has(node.type)) return [node.children.find((child) => !child.isNamed)!.text, ...children.map(group)];
  return node.text;
}
