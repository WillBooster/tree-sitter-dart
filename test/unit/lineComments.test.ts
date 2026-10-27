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

const comments = ['//', '// text', '///', '/// documentation', '// backslash\\', '/// before\0after'];
const terminators = [
  { name: 'CR', text: '\r' },
  { name: 'CRLF', text: '\r\n' },
  { name: 'LF', text: '\n' },
];

for (const { name, text } of terminators) {
  test.each(comments)(`ends %j before ${name} and retains the following declaration`, (comment) => {
    const tree = parser!.parse(`void f(){\n${comment}${text}var after=1;\nprint(after);\n}`)!;
    try {
      expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
      expect(tree.rootNode.descendantsOfType('comment').map((node) => node.text)).toEqual([comment]);
      expect(tree.rootNode.descendantsOfType('local_variable_declaration').map((node) => node.text)).toEqual([
        'var after=1;',
      ]);
    } finally {
      tree.delete();
    }
  });
}
