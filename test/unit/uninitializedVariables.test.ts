import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

let parser: Parser;

beforeAll(async () => {
  await Parser.init();
  parser = new Parser().setLanguage(
    await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'))
  );
});

afterAll(() => parser.delete());

const fields = [
  'abstract var first, second;',
  'abstract covariant var first, second;',
  'abstract int first, second;',
  'abstract final first, second;',
  'abstract final int first, second;',
  'external var first, second;',
  'external static var first, second;',
  'external covariant var first, second;',
  'external int first, second;',
  'external final first, second;',
  'external final int first, second;',
];

test.each(fields)('retains the declared field names in %s', (declaration) => {
  const tree = parser.parse(`abstract class C { ${declaration} }`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const field = tree.rootNode.descendantsOfType('declaration')[0]!;
    expect(field.text).toBe(declaration.slice(0, -1));
    expect(field.descendantsOfType('identifier_list')[0]!.namedChildren.map((node) => node.text)).toEqual([
      'first',
      'second',
    ]);
  } finally {
    tree.delete();
  }
});

test.each(['var', 'int', 'final', 'final int'])('retains the external variable type and names for %s', (head) => {
  const declaration = `external ${head} first, second;`;
  const tree = parser.parse(`${declaration}\nvoid following() {}`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const variable = tree.rootNode.namedChildren[0]!;
    expect(variable.type).toBe('external_variable_declaration');
    expect(variable.text).toBe(declaration);
    expect(variable.childForFieldName('modifier')?.text).toBe('external');
    expect(variable.childForFieldName('type')?.text).toBe(head.includes('int') ? 'int' : undefined);
    expect(variable.descendantsOfType('identifier_list')[0]!.namedChildren.map((node) => node.text)).toEqual([
      'first',
      'second',
    ]);
    expect(tree.rootNode.namedChildren[1]!.childForFieldName('signature')!.childForFieldName('name')?.text).toBe(
      'following'
    );
  } finally {
    tree.delete();
  }
});

test.each([
  'abstract class C { abstract var int value; }',
  'abstract class C { abstract covariant var int value; }',
  'class C { external var int value; }',
  'external var int value;',
  'external var;',
])('flags an incomplete or conflicting variable header in %s', (source) => {
  const tree = parser.parse(`${source}\nvoid following() {}`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(true);
    expect(tree.rootNode.namedChildren.at(-1)!.childForFieldName('signature')!.childForFieldName('name')?.text).toBe(
      'following'
    );
  } finally {
    tree.delete();
  }
});
