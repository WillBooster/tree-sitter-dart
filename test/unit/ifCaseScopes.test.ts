import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

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
