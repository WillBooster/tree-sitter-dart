import fs from 'node:fs';
import path from 'node:path';

import { Edit, Language, Parser, Query, type Tree } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

import fixtures from '../fixtures/simpleInterpolation.json';
import { captureRecord, checkFollowing, matchRecord, nodeRecord } from '../helpers/treeRecords';

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
const queries: Query[] = [];

beforeAll(async () => {
  try {
    await Parser.init();
    const language = await Language.load(path.join(repositoryRoot, 'tree-sitter-dart.wasm'));
    parser = new Parser();
    parser.setLanguage(language);
    for (const name of ['tags', 'highlights', 'locals']) {
      queries.push(new Query(language, fs.readFileSync(path.join(repositoryRoot, `queries/${name}.scm`), 'utf8')));
    }
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
        const escapeCaptures = queries[1]!
          .captures(tree.rootNode)
          .filter((capture) => capture.name === 'string.escape')
          .map(({ node }) => [node.text, node.startIndex - prefix.length, node.endIndex - prefix.length]);
        expect(escapeCaptures).toEqual(expectedEscapes);
        for (const query of queries) query.captures(tree.rootNode);
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

const edits = [
  [String.raw`'$a\$suffix'`, "'$a$suffix'"],
  ["'$a$suffix'", String.raw`'$a\$suffix'`],
  [String.raw`'$a\$suffix'`, "'${a}\\$suffix'"],
  [String.raw`'$a\$suffix'`, String.raw`r'$a\$suffix'`],
  [String.raw`r'$a\$suffix'`, String.raw`'$a\$suffix'`],
  [String.raw`'$a\$suffix'`, String.raw`'''$a\$suffix'''`],
  [String.raw`'$a\$suffix'`, "'$aé'"],
  ["'$aé'", String.raw`'$a\$suffix'`],
  ["'$a'", "'$ a'"],
  ["'$ a'", "'$a'"],
  ["'${a}'", "'$ {a}'"],
  ["'$ {a}'", "'${ a }'"],
  ["'$1'", "r'$1'"],
  ["r'$1'", "'$1'"],
  ["'$/*comment*/{a}'", "'${/*comment*/a}'"],
];

test.each(edits)('editing %s to %s preserves the complete tree and ordered query results', (before, after) => {
  const prefix = 'var text = ';
  const suffix = ';\nvoid following() {}';
  const old = parser!.parse(prefix + before + suffix)!;
  let incremental: Tree | undefined;
  let fresh: Tree | undefined;
  try {
    old.edit(
      new Edit({
        startIndex: prefix.length,
        oldEndIndex: prefix.length + before.length,
        newEndIndex: prefix.length + after.length,
        startPosition: { row: 0, column: prefix.length },
        oldEndPosition: { row: 0, column: prefix.length + before.length },
        newEndPosition: { row: 0, column: prefix.length + after.length },
      })
    );
    incremental = parser!.parse(prefix + after + suffix, old)!;
    fresh = parser!.parse(prefix + after + suffix)!;
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
  } finally {
    fresh?.delete();
    incremental?.delete();
    old.delete();
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
  expect(
    queries[0]!
      .captures(tree.rootNode)
      .filter((capture) => capture.name === 'name' && capture.node.text === 'following')
      .map(({ node }) => [node.startIndex, node.endIndex])
  ).toEqual([[name.startIndex, name.endIndex]]);
  for (const query of queries) query.matches(tree.rootNode);
}

function cleanup(): void {
  const ownedQueries = queries.splice(0);
  const ownedParser = parser;
  parser = undefined;
  for (const query of ownedQueries) query.delete();
  ownedParser?.delete();
}
