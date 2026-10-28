import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser, Query } from '@willbooster/web-tree-sitter';
import { afterAll, expect, test } from 'vitest';

import { testCommand } from './run.js';

const root = path.resolve(import.meta.dirname, '../..');
const cache = path.join(root, '.tmp', `generic-call-highlight-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'generic invocation highlights retain local bindings and member roles',
  [
    'script/tree-sitter',
    'highlight',
    '--grammar-path',
    '.',
    '--html',
    '--layout',
    'fragment',
    '--style',
    'minimal',
    '--config-path',
    'test/fixtures/genericCallHighlightConfig.json',
    'test/fixtures/genericCallHighlight.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      expect(output).toContain("<span class='function'>direct</span>&lt;int&gt;(1)");
      expect(output.match(/<span class='function method call'>member<\/span>&lt;int&gt;\(1\)/g)).toHaveLength(2);
      expect(output).toContain("Box.<span class='function method call'>staticCall</span>&lt;int&gt;(1)");
      expect(output).toContain("<span class='variable'>callback</span>&lt;int&gt;(1)");
      expect(output).toContain("value.<span class='property'>member</span>&lt;int&gt;;");
      expect(output).toContain("(nullable?.<span class='property'>member</span>)!&lt;int&gt;;");
      expect(output).toContain("Box.<span class='property'>staticCall</span>&lt;int&gt;;");
    },
  }
);

test('only invoked instantiations receive generic call captures', async () => {
  await Parser.init();
  const language = await Language.load(path.join(root, 'tree-sitter-dart.wasm'));
  const parser = new Parser();
  parser.setLanguage(language);
  const query = new Query(language, fs.readFileSync(path.join(root, 'queries/highlights.scm'), 'utf8'));
  const tree = parser.parse(fs.readFileSync(path.join(root, 'test/fixtures/genericCallHighlight.dart'), 'utf8'))!;
  try {
    expect(tree.rootNode.hasError).toBe(false);
    const calls = query
      .captures(tree.rootNode)
      .filter(
        ({ name, node }) =>
          name.endsWith('.call') &&
          (node.parent?.type === 'instantiation_expression' || node.parent?.parent?.type === 'instantiation_expression')
      );
    expect(calls.map(({ node }) => node.text)).toEqual(['direct', 'member', 'member', 'staticCall', 'callback']);
  } finally {
    tree.delete();
    query.delete();
    parser.delete();
  }
});
