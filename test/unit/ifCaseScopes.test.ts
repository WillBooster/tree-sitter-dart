import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, expect, test } from 'vitest';

import { testCommand } from './run.js';

const cache = path.resolve(import.meta.dirname, '../../.tmp', `if-case-scope-${randomUUID()}`);
afterAll(() => fs.rmSync(cache, { recursive: true, force: true }));

testCommand(
  'if-case guards and consequences retain bindings without leaking to else or following code',
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
    'test/fixtures/callableHighlightConfig.json',
    'test/fixtures/ifCaseScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: cache, CARGO_BUILD_JOBS: '1' },
    check: (html) => {
      const basic = section(html, 'basic', 'logical');
      expect(nameStyles(matchingLine(basic, 'when'))).toEqual([
        'variable',
        'variable',
        'variable',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(basic, ')<span'))).toEqual(['variable', 'variable', 'function', 'function']);
      expect(basic.includes("<span class='variable'>target</span>();<span class='function'>target</span>();")).toBe(
        true
      );
      const logical = section(html, 'logical', 'nested');
      expect(nameStyles(matchingLine(logical, '&amp;&amp; var'))).toEqual([
        'variable',
        'variable',
        'variable',
        'variable',
        'variable',
        'variable',
        'function',
        'function',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(logical, '|| var'))).toEqual([
        'variable',
        'variable',
        'variable',
        'variable',
        'function',
        'function',
      ]);
      const nested = section(html, 'nested', 'closures');
      expect(nameStyles(matchingLine(nested, 'if(second'))).toEqual([
        'variable',
        'variable',
        'variable',
        'variable',
        'variable',
        'function',
      ]);
      expect(nameStyles(matchingLine(nested, '}else if'))).toEqual([
        'variable',
        'variable',
        'function',
        'variable',
        'function',
        'function',
      ]);
      expect(nested.includes("<span class='variable'>target</span>();<span class='function'>other</span>();")).toBe(
        true
      );
      const closures = section(html, 'closures', 'list');
      expect(
        closures.includes("{int <span class='function'>target</span>()=&gt;1;<span class='function'>target</span>();}")
      ).toBe(true);
      expect(closures.includes("(()=&gt;<span class='variable'>target</span>())();")).toBe(true);
      const list = section(html, 'list', 'map');
      expect(nameStyles(matchingLine(list, 'when'))).toEqual([
        'variable',
        'variable',
        'variable',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(list, '&amp;&amp; var'))).toEqual([
        'variable',
        'variable',
        'variable',
        'variable',
        'function',
        'function',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(list, '...['))).toEqual(['variable', 'variable', 'function', 'function']);
      expect(nameStyles(matchingLine(section(html, 'map', 'set'), 'case'))).toEqual([
        'variable',
        'variable',
        'variable',
        'variable',
        'function',
        'function',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(section(html, 'set', 'cascade'), 'case'))).toEqual([
        'variable',
        'variable',
        'function',
        'function',
      ]);
      expect(nameStyles(matchingLine(section(html, 'cascade', 'main'), 'case'))).toEqual([
        'variable',
        'variable',
        'function',
        'function',
      ]);
    },
  }
);

test('if-case clauses expose the complete guarded pattern and preserve consequence fields', async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  const parser = new Parser();
  parser.setLanguage(language);
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../fixtures/ifCaseScope.dart'), 'utf8');
  const tree = parser.parse(source)!;
  expect(tree.rootNode.hasError).toBe(false);
  const clauses = tree.rootNode.descendantsOfType('if_case_clause');
  expect(clauses).toHaveLength(15);
  const guarded = clauses.find((clause) => clause.text.includes('&&'))!;
  expect(guarded.text).toBe('case var target && var other when target()>0 && other()>0');
  expect(guarded.parent!.childForFieldName('consequence')!.text).toBe('{target();other();}');
  expect(guarded.parent!.childForFieldName('alternative')!.text).toBe('{target();other();}');
  const cascade = clauses.find((clause) => clause.text.includes('var receiver'))!;
  expect(cascade.parent!.childrenForFieldName('consequence').map((node) => node.text)).toEqual([
    'receiver',
    '..run(other())',
  ]);
  tree.delete();
  parser.delete();
});

function nameStyles(line: string): string[] {
  return [...line.matchAll(/<span class='([^']+)'>(target|other)<\/span>/g)].map((match) => match[1]!);
}

function section(html: string, start: string, end: string): string {
  return html.split(`<span class='function'>${start}</span>`)[1]!.split(`<span class='function'>${end}</span>`)[0]!;
}

function matchingLine(part: string, marker: string): string {
  return part.split('\n').find((value) => value.includes(marker))!;
}
