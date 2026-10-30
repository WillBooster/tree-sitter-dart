import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
let parser: Parser | undefined;

const validCases = [
  {
    name: 'record',
    source: 'void main(){var(a,b)=(1,2);print(a+b);}',
  },
  {
    name: 'final record',
    source: 'void main(){final(a,b)=(1,2);print(a+b);}',
  },
  {
    name: 'list rest',
    source: 'void main(){var[first,...rest]=[1,2,3];print(first+rest.length);}',
  },
  {
    name: 'map',
    source: "void main(){var{'key':item}={'key':3};print(item);}",
  },
  {
    name: 'object',
    source: 'class C{final int value;C(this.value);} void main(){var C(value:item)=C(3);print(item);}',
  },
  {
    name: 'nested',
    source: 'void main(){var(a,[b,...rest])=(1,[2,3]);print(a+b+rest.length);}',
  },
  {
    name: 'for record',
    source: 'void main(){for(var(a,b)in[(1,2)]){print(a+b);}}',
  },
  {
    name: 'for list',
    source: 'void main(){for(final[a,...rest]in[[1,2]]){print(a+rest.length);}}',
  },
  {
    name: 'typed',
    source: 'void main(){var(int a,int b)=(1,2);print(a+b);}',
  },
  {
    name: 'and',
    source: 'void main(){var(a&&b,c)=(1,2);print(a+b+c);}',
  },
  {
    name: 'cast assert',
    source: 'void main(){Object? object=1;var(a as int,b!)=(object,object);print((a,b));}',
  },
  {
    name: 'wildcard',
    source: 'void main(){var(_, _value)=(1,2);print(_value);}',
  },
  {
    name: 'matching',
    source: "const one=1,two=2;void main(){switch((1,2)){case(one,two):print('match');}}",
  },
  {
    name: 'assignment',
    source: 'void main(){var(a,b)=(1,2);(a,b)=(3,4);print(a+b);}',
  },
  {
    name: 'rest wildcard',
    source: "void main(){var[_,..._]=[1,2,3];print('ok');}",
  },
];

const invalidCases = [
  {
    name: 'nested var',
    source: 'void main(){var(var a,b)=(1,2);print(a+b);}',
  },
  {
    name: 'nested final',
    source: 'void main(){var(final a,b)=(1,2);print(a+b);}',
  },
  {
    name: 'nested modifier in loop',
    source: 'void main(){for(var(final a,b)in[(1,2)]){print(a+b);}}',
  },
  {
    name: 'constant invalid',
    source: 'void main(){var(1,b)=(1,2);print(b);}',
  },
  {
    name: 'nullcheck invalid',
    source: 'void main(){var(a?,b)=(1,2);print(b);}',
  },
  {
    name: 'bool invalid',
    source: 'void main(){var(true,b)=(true,2);print(b);}',
  },
];

beforeAll(async () => {
  await Parser.init();
  const language = await Language.load(path.join(root, 'tree-sitter-dart.wasm'));
  parser = new Parser();
  parser.setLanguage(language);
});

afterAll(() => {
  parser?.delete();
});

test.each(validCases)('accepts $name in a declaration context', ({ source }) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const main = tree.rootNode.namedChildren.find(
      (node) =>
        node.type === 'function_declaration' &&
        node.childForFieldName('signature')?.childForFieldName('name')?.text === 'main'
    );
    expect(main).toBeDefined();
  } finally {
    tree.delete();
  }
});

test.each(invalidCases)('rejects $name in a declaration context', ({ source }) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(true);
  } finally {
    tree.delete();
  }
});
