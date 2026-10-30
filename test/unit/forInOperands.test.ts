import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

test('undeclared for-in operands parse without errors', async () => {
  await Parser.init();
  const language = await Language.load(path.resolve(import.meta.dirname, '../../tree-sitter-dart.wasm'));
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse('void main(){var current=0;for(current in[1,2]){print(current);}print(current);}')!;
  try {
    expect(tree.rootNode.hasError).toBe(false);
  } finally {
    tree.delete();
    parser.delete();
  }
});
