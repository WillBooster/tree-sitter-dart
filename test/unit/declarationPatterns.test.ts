import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser, Query } from '@willbooster/web-tree-sitter';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { testCommand } from './run.js';

const root = path.resolve(import.meta.dirname, '../..');
const highlightCache = path.join(root, '.tmp', `declaration-scope-${randomUUID()}`);
let parser: Parser | undefined;
let locals: Query | undefined;
let highlights: Query | undefined;

const validCases = [
  {
    name: 'record',
    source: 'void main(){var(a,b)=(1,2);print(a+b);}',
    bindings: ['a', 'b'],
  },
  {
    name: 'final record',
    source: 'void main(){final(a,b)=(1,2);print(a+b);}',
    bindings: ['a', 'b'],
  },
  {
    name: 'list rest',
    source: 'void main(){var[first,...rest]=[1,2,3];print(first+rest.length);}',
    bindings: ['first', 'rest'],
  },
  {
    name: 'map',
    source: "void main(){var{'key':item}={'key':3};print(item);}",
    bindings: ['item'],
  },
  {
    name: 'object',
    source: 'class C{final int value;C(this.value);} void main(){var C(value:item)=C(3);print(item);}',
    bindings: ['item'],
  },
  {
    name: 'nested',
    source: 'void main(){var(a,[b,...rest])=(1,[2,3]);print(a+b+rest.length);}',
    bindings: ['a', 'b', 'rest'],
  },
  {
    name: 'for record',
    source: 'void main(){for(var(a,b)in[(1,2)]){print(a+b);}}',
    bindings: ['a', 'b'],
  },
  {
    name: 'for list',
    source: 'void main(){for(final[a,...rest]in[[1,2]]){print(a+rest.length);}}',
    bindings: ['a', 'rest'],
  },
  {
    name: 'typed',
    source: 'void main(){var(int a,int b)=(1,2);print(a+b);}',
    bindings: ['a', 'b'],
  },
  {
    name: 'and',
    source: 'void main(){var(a&&b,c)=(1,2);print(a+b+c);}',
    bindings: ['a', 'b', 'c'],
  },
  {
    name: 'cast assert',
    source: 'void main(){Object? object=1;var(a as int,b!)=(object,object);print((a,b));}',
    bindings: ['object', 'a', 'b'],
  },
  {
    name: 'wildcard',
    source: 'void main(){var(_, _value)=(1,2);print(_value);}',
    bindings: ['_value'],
  },
  {
    name: 'matching',
    source: "const one=1,two=2;void main(){switch((1,2)){case(one,two):print('match');}}",
    bindings: [],
  },
  {
    name: 'assignment',
    source: 'void main(){var(a,b)=(1,2);(a,b)=(3,4);print(a+b);}',
    bindings: ['a', 'b'],
  },
  {
    name: 'rest wildcard',
    source: "void main(){var[_,..._]=[1,2,3];print('ok');}",
    bindings: [],
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
  locals = new Query(language, fs.readFileSync(path.join(root, 'queries/locals.scm'), 'utf8'));
  highlights = new Query(language, fs.readFileSync(path.join(root, 'queries/highlights.scm'), 'utf8'));
});

afterAll(() => {
  highlights?.delete();
  locals?.delete();
  parser?.delete();
  fs.rmSync(highlightCache, { recursive: true, force: true });
});

test.each(validCases)('binds declaration names in $name', ({ source, bindings }) => {
  const tree = parser!.parse(source)!;
  try {
    expect(tree.rootNode.hasError, tree.rootNode.toString()).toBe(false);
    const main = tree.rootNode.namedChildren.find(
      (node) =>
        node.type === 'function_declaration' &&
        node.childForFieldName('signature')?.childForFieldName('name')?.text === 'main'
    );
    expect(main).toBeDefined();
    const definitions = locals!
      .captures(main!)
      .filter(({ name }) => name === 'local.definition')
      .map(({ node }) => node.text);
    expect(definitions).toEqual(['main', ...bindings]);
    const variables = highlights!
      .captures(main!)
      .filter(({ name }) => name === 'variable')
      .map(({ node }) => node.text);
    expect(variables).toEqual(bindings);
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

testCommand(
  'collection-loop bindings do not shadow an outer function after the loop',
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
    'test/fixtures/patternScope.dart',
  ],
  120_000,
  {
    env: { TREE_SITTER_LIBDIR: highlightCache, CARGO_BUILD_JOBS: '1' },
    check: (output) => {
      const call = output.match(/\n {2}<span class=['"]([^'"]+)['"]>a<\/span>\(\);/);
      expect(call, output).not.toBeNull();
      const classes = call![1]!.split(' ');
      expect(classes).toContain('function');
      expect(classes).not.toContain('variable');
    },
  }
);
