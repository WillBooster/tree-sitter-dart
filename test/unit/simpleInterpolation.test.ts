import path from 'node:path';

import { Language, Parser, type Tree } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

import fixtures from '../fixtures/simpleInterpolation.json';
import { checkFollowing } from '../helpers/checkFollowing';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const quotes = ["'", '"', "'''", '"""'];
const invalidDollarBodies = [
  '$1',
  '$!',
  '$$',
  '$',
  '$ a',
  '$\ta',
  '$/*comment*/a',
  '$ {a}',
  '$\t{a}',
  '$/*comment*/{a}',
  String.raw`$\$suffix`,
  String.raw`$\u0061`,
  '$é',
];
let parser: Parser | undefined;

beforeAll(async () => {
  try {
    await Parser.init();
    const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
    parser = new Parser();
    parser.setLanguage(language);
  } catch (error) {
    cleanup();
    throw error;
  }
});

afterAll(cleanup);

for (const quote of quotes) {
  test.each(fixtures)(
    `${quote} $title keeps simple interpolation within its identifier`,
    ({ body, expectedSimple, expectedEscapes }) => {
      const prefix = `var text = ${quote}`;
      const tree = parser!.parse(`${prefix}${body}${quote};\nvoid following() {}`)!;
      try {
        expect(tree.rootNode.hasError).toBe(false);
        expect(
          tree.rootNode
            .descendantsOfType('identifier_dollar_escaped')
            .map((node) => [node.text, node.startIndex - prefix.length, node.endIndex - prefix.length])
        ).toEqual(expectedSimple);
        expect(
          tree.rootNode
            .descendantsOfType('escape_sequence')
            .map((node) => [node.text, node.startIndex - prefix.length, node.endIndex - prefix.length])
        ).toEqual(expectedEscapes);
        checkFollowing(tree.rootNode);
      } finally {
        tree.delete();
      }
    }
  );

  test.each([String.raw`$a\$suffix`, '$a$b', '${a}\\$tail', ...invalidDollarBodies])(
    `${quote} raw %s contains no interpolation`,
    (body) => {
      const source = `var text = r${quote}${body}${quote};\nvoid following() {}`;
      const tree = parser!.parse(source)!;
      try {
        expect(tree.rootNode.hasError).toBe(false);
        expect(tree.rootNode.descendantsOfType('template_substitution')).toHaveLength(0);
        checkDollarBoundary(tree, source);
      } finally {
        tree.delete();
      }
    }
  );

  test.each(invalidDollarBodies)(`${quote} rejects %s without consuming the following declaration`, (body) => {
    const source = `var text = ${quote}${body}${quote};\nvoid following() {}`;
    const tree = parser!.parse(source)!;
    try {
      expect(tree.rootNode.hasError).toBe(true);
      checkDollarBoundary(tree, source);
    } finally {
      tree.delete();
    }
  });

  test.each(['${ a }', '${/*comment*/a}'])(`${quote} permits trivia inside %s`, (body) => {
    const source = `var text = ${quote}${body}${quote};\nvoid following() {}`;
    const tree = parser!.parse(source)!;
    try {
      expect(tree.rootNode.hasError).toBe(false);
      expect(tree.rootNode.descendantsOfType('template_substitution').map((node) => node.text)).toEqual([body]);
      checkDollarBoundary(tree, source);
    } finally {
      tree.delete();
    }
  });
}

test.each([
  "'$a$suffix'",
  String.raw`'$a\$suffix'`,
  "'${a}\\$suffix'",
  String.raw`r'$a\$suffix'`,
  String.raw`'''$a\$suffix'''`,
  "'$aé'",
  "'$ a'",
  "'$a'",
  "'$ {a}'",
  "'${ a }'",
  "r'$1'",
  "'$1'",
  "'${/*comment*/a}'",
])('%s keeps the following declaration', (literal) => {
  const tree = parser!.parse(`var text = ${literal};\nvoid following() {}`)!;
  try {
    checkFollowing(tree.rootNode);
  } finally {
    tree.delete();
  }
});

function checkDollarBoundary(tree: Tree, source: string): void {
  checkFollowing(tree.rootNode);
  const declaration = tree.rootNode.namedChildren.at(-1)!;
  expect(declaration.hasError).toBe(false);
  expect(declaration.startIndex).toBe(source.indexOf('void following() {}'));
  expect(declaration.endIndex).toBe(source.length);
  const name = declaration.childForFieldName('signature')!.childForFieldName('name')!;
  expect([name.text, name.startIndex, name.endIndex]).toEqual([
    'following',
    source.indexOf('following'),
    source.indexOf('following') + 'following'.length,
  ]);
}

function cleanup(): void {
  const ownedParser = parser;
  parser = undefined;
  ownedParser?.delete();
}
