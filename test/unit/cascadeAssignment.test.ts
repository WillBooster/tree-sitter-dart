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

afterAll(() => parser?.delete());

const cascadeBodies = ['x..y=b=a..z();', 'x..y+=b=a..z();', 'x..y=throw a..z();', 'x..y=b=throw a..z();'];

test.each(cascadeBodies)('keeps the trailing cascade on the outer receiver: %s', (body) => {
  const tree = parser!.parse(`void f(){${body}}`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const statement = tree.rootNode.descendantsOfType('expression_statement')[0]!;
    const sections = statement.namedChildren.filter((node) => node.type === 'cascade_section');
    expect(statement.namedChildren[0]?.text).toBe('x');
    expect(sections.map((node) => node.text)).toEqual([body.slice(1, body.indexOf('..z()')), '..z()']);
    expect(sections[0]?.descendantsOfType('cascade_section').map((node) => node.text)).toEqual([sections[0]?.text]);
  } finally {
    tree.delete();
  }
});

test.each(['b=a..z();', 'throw a..z();'])('retains cascades in an ordinary expression: %s', (body) => {
  const tree = parser!.parse(`void f(){${body}}`)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const statement = tree.rootNode.descendantsOfType('expression_statement')[0]!;
    expect(statement.namedChildren.filter((node) => node.type === 'cascade_section')).toEqual([]);
    const section = statement.descendantsOfType('cascade_section')[0]!;
    expect(section.text).toBe('..z()');
    expect(section.parent?.type).toBe(body.startsWith('throw') ? 'throw_expression' : 'assignment_expression');
  } finally {
    tree.delete();
  }
});

test('parentheses retain an inner cascade receiver', () => {
  const tree = parser!.parse('void f(){x..y=(b=a..z());}')!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const statement = tree.rootNode.descendantsOfType('expression_statement')[0]!;
    expect(statement.namedChildren.filter((node) => node.type === 'cascade_section').map((node) => node.text)).toEqual([
      '..y=(b=a..z())',
    ]);
    const inner = statement.descendantsOfType('cascade_section').find((node) => node.text === '..z()')!;
    expect(inner.parent?.type).toBe('assignment_expression');
    expect(inner.parent?.parent?.type).toBe('parenthesized_expression');
  } finally {
    tree.delete();
  }
});

test.each(['c?a:b=d..z();', 'c?a:throw d..z();'])(
  'keeps a conditional branch from absorbing the trailing cascade: %s',
  (body) => {
    const tree = parser!.parse(`void f(){${body}}`)!;
    try {
      expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
      const statement = tree.rootNode.descendantsOfType('expression_statement')[0]!;
      expect(statement.namedChildren.map((node) => node.type)).toEqual(['conditional_expression', 'cascade_section']);
      expect(statement.namedChildren[0]?.descendantsOfType('cascade_section').map((node) => node.text)).toEqual([]);
      expect(statement.namedChildren[1]?.text).toBe('..z()');
    } finally {
      tree.delete();
    }
  }
);
