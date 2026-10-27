import fs from 'node:fs';
import path from 'node:path';

import {
  Edit,
  Language,
  type Node,
  Parser,
  Query,
  type QueryCapture,
  type QueryMatch,
} from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

import cases from '../fixtures/ifNullPrecedence.json';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const binaryKinds = new Set([
  'if_null_expression',
  'logical_or_expression',
  'logical_and_expression',
  'equality_expression',
  'additive_expression',
]);
let parser: Parser | undefined;
const queries: Query[] = [];

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
  for (const name of ['tags', 'highlights', 'locals']) {
    queries.push(new Query(language, fs.readFileSync(path.join(repositoryRoot, `queries/${name}.scm`), 'utf8')));
  }
});

afterAll(() => {
  for (const query of queries) query.delete();
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
  for (const query of queries) query.captures(tree.rootNode);
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

const edits = [
  ['a ?? (b ? c : d)', 'a ?? b ? c : d', 'a ?? b ? c : d'],
  ['a ?? b', 'a ?? b ?? c', 'a ?? b ?? c'],
  ['a ?? b ? c : d', '(a ?? b) ? c : d', '(a ?? b) ? c : d'],
] as const;

test.each(edits)(
  'editing %s to %s preserves grouping, fields, ranges and raw query results',
  (before, after, fixture) => {
    const source = `var result = ${before};\nvoid following() {}`;
    const startIndex = source.indexOf(before);
    const updated = source.slice(0, startIndex) + after + source.slice(startIndex + before.length);
    const old = parser!.parse(source)!;
    old.edit(
      new Edit({
        startIndex,
        oldEndIndex: startIndex + before.length,
        newEndIndex: startIndex + after.length,
        startPosition: { row: 0, column: startIndex },
        oldEndPosition: { row: 0, column: startIndex + before.length },
        newEndPosition: { row: 0, column: startIndex + after.length },
      })
    );
    const incremental = parser!.parse(updated, old)!;
    const fresh = parser!.parse(updated)!;
    expect(incremental.rootNode.hasError).toBe(false);
    const value = incremental.rootNode.descendantsOfType('initialized_identifier')[0]!.namedChildren[1]!;
    expect(group(value)).toEqual(cases.find((item) => item.expression === fixture)!.expected);
    expect(nodeRecord(incremental.rootNode)).toEqual(nodeRecord(fresh.rootNode));
    for (const query of queries) {
      expect(query.matches(incremental.rootNode).map(matchRecord)).toEqual(
        query.matches(fresh.rootNode).map(matchRecord)
      );
      expect(query.captures(incremental.rootNode).map(captureRecord)).toEqual(
        query.captures(fresh.rootNode).map(captureRecord)
      );
    }
    checkFollowing(incremental.rootNode);
    fresh.delete();
    incremental.delete();
    old.delete();
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

function checkFollowing(root: Node): void {
  const declaration = root.namedChildren.at(-1)!;
  expect(declaration.type).toBe('function_declaration');
  expect(declaration.childForFieldName('signature')!.childForFieldName('name')!.text).toBe('following');
}

function nodeRecord(node: Node): unknown[] {
  return [
    node.type,
    node.isNamed,
    node.isMissing,
    node.hasError,
    node.startIndex,
    node.endIndex,
    node.startPosition,
    node.endPosition,
    node.children.map((child, index) => [node.fieldNameForChild(index), nodeRecord(child)]),
  ];
}

function matchRecord(match: QueryMatch): Record<string, unknown> {
  const { captures, ...metadata } = match;
  return { ...metadata, captures: captures.map(captureRecord) };
}

function captureRecord(capture: QueryCapture): Record<string, unknown> {
  const { node, ...metadata } = capture;
  return {
    ...metadata,
    node: {
      type: node.type,
      text: node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      startPosition: node.startPosition,
      endPosition: node.endPosition,
      isNamed: node.isNamed,
      isMissing: node.isMissing,
      hasError: node.hasError,
    },
  };
}
