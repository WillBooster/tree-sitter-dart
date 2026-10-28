import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser, Query } from '@willbooster/web-tree-sitter';
import { afterAll, expect, test } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `scalar-loop-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'scalar loop bindings respect iterable, lambda, wildcard, and adjacent outer scopes',
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
    'test/fixtures/patternHighlightConfig.json',
    'test/fixtures/scalarLoopScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      const expected = [
        ['variable', 'function', 'variable', 'function'],
        ['variable', 'function', 'variable'],
        ['variable', 'function', 'function', 'variable'],
        ['variable', 'function', 'function', 'variable'],
        ['variable', 'function', 'variable', 'variable', 'variable'],
        ['variable', 'function', 'variable', 'variable', 'variable'],
        ['function', 'function'],
        ['function'],
      ];
      const loops = output.split('\n').filter((line) => line.includes('for (final'));
      expect(loops).toHaveLength(expected.length);
      for (const [index, line] of loops.entries()) {
        const styles = [...line.matchAll(/<span class=['"]([^'"]+)['"]>a<\/span>/g)].map((match) => match[1]);
        expect(styles, line).toEqual(expected[index]);
      }
      expect(output).toMatch(/}<span class=['"]function['"]>a<\/span>\(\);/);
      expect(output.match(/<span class=['"]variable['"]>_value<\/span>/g)).toHaveLength(2);
      expect(output).not.toMatch(/<span[^>]+>_<\/span>/);
    },
  }
);

testCommand(
  'record labels preserve adjacent value resolution and rethrow is a keyword',
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
    'test/fixtures/dart3HighlightConfig.json',
    'test/fixtures/recordLabelScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      expect(
        output.match(/<span class=['"]property['"]>item<\/span>:<span class=['"]function['"]>item<\/span>\(\)/g)
      ).toHaveLength(2);
      expect(output).toContain("record.<span class='property'>item</span>");
      expect(output).toContain("multiple.<span class='property'>first</span>");
      expect(output).toContain("<span class='keyword'>rethrow</span>");
      expect(output).toContain("<span class='property'>item</span>:<span class='variable'>single</span>");
      expect(output).toContain("<span class='property'>item</span>:<span class='variable'>secondValue</span>");
      expect(output).toContain("<span class='property'>item</span>:<span class='variable'>boxed</span>");
      expect(output).toContain(
        "<span class='property'>item</span>:<span class='keyword'>var</span> <span class='variable'>matched</span>"
      );
      expect(output).toContain(
        "<span class='property'>item</span>:<span class='keyword'>var</span> <span class='variable'>objectMatch</span>"
      );
      expect(output).toContain("<span class='keyword'>const</span> (<span class='property'>item</span>:1)");
      expect(output).toContain(
        "<span class='keyword'>const</span> (<span class='property'>first</span>:1,<span class='property'>item</span>:1)"
      );
      const shorthand = output
        .split("<span class='function'>shorthand</span>")[1]!
        .split("<span class='function'>main</span>")[0]!;
      expect(shorthand.match(/<span class=['"]variable['"]>item<\/span>/g)).toHaveLength(8);
      expect(shorthand.match(/<span class=['"]variable['"]>item<\/span>\(\)/g)).toHaveLength(4);
      expect(shorthand.match(/<span class=['"]function['"]>item<\/span>\(\)/g)).toHaveLength(1);
    },
  }
);

test('undeclared for-in operands remain references to an existing binding', async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  const parser = new Parser();
  const locals = new Query(
    language,
    fs.readFileSync(path.resolve(import.meta.dirname, '../../queries/locals.scm'), 'utf8')
  );
  parser.setLanguage(language);
  const tree = parser.parse('void main(){var current=0;for(current in[1,2]){print(current);}print(current);}')!;
  try {
    expect(tree.rootNode.hasError).toBe(false);
    const definitions = locals
      .captures(tree.rootNode)
      .filter(({ name, node }) => name === 'local.definition' && node.text === 'current');
    expect(definitions).toHaveLength(1);
    const loop = tree.rootNode.descendantsOfType('for_statement')[0]!;
    const captures = locals.captures(loop);
    expect(captures.filter(({ name }) => name === 'local.definition')).toHaveLength(0);
    expect(captures.filter(({ name, node }) => name === 'local.reference' && node.text === 'current')).toHaveLength(2);
  } finally {
    locals.delete();
    tree.delete();
    parser.delete();
  }
});
