import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');

test('generic invocations and instantiations parse without errors', async () => {
  await Parser.init();
  const language = await Language.load(path.join(root, 'tree-sitter-dart.wasm'));
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(fs.readFileSync(path.join(root, 'test/fixtures/genericCalls.dart'), 'utf8'))!;
  try {
    expect(tree.rootNode.hasError).toBe(false);
  } finally {
    tree.delete();
    parser.delete();
  }
});
