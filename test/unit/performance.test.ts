import fs from 'node:fs';
import path from 'node:path';

import { Language, Parser } from '@willbooster/web-tree-sitter';
import { expect, test } from 'vitest';

import { generationInputMtime } from '../helpers/generationInputs.js';

const Root = path.join(import.meta.dirname, '../..');
// The Wasm build is the one the package ships.
const WasmPath = path.join(Root, 'tree-sitter-dart.wasm');
await Parser.init();
const parser = new Parser();
parser.setLanguage(await Language.load(WasmPath));

// The tests load the existing Wasm build, so a stale one would hide an edit that makes error recovery slower than linear.
test('uses a Wasm build built from the current parser', () => {
  const sources = ['grammar.js', 'src/parser.c', 'src/scanner.c', 'src/tree_sitter/parser.h'].map(
    (name) => fs.statSync(path.join(Root, name)).mtimeMs
  );
  expect(
    Math.max(generationInputMtime(Root), ...sources) > fs.statSync(WasmPath).mtimeMs,
    'generation inputs or src/ changed after the Wasm build was built; run `bun run build/ci`'
  ).toBe(false);
});

// Consumers parse files being edited, so recovering from many errors must stay linear: ten times the lines take about
// ten times as long, against a hundred times for quadratic recovery. The ratio catches a cost that grows faster than
// the input even on a slow CI runner. The parses are timed in the CPU time of the thread that runs them: wall-clock
// time is inflated unevenly by the test files running alongside, and the process's CPU time also counts the engine's
// background threads, which compile the Wasm build and collect garbage during the parses. 2,000 and 20,000 lines are
// measured after warm-up parses and in alternation, each keeping its fastest run; their ratio is about 10 locally, and
// 18 leaves a margin over that while failing for growth faster than about n^1.25.
test('recovers from an error on each line in linear time', { timeout: 60_000 }, () => {
  expectLinearErrorParse('$ a\n'.repeat(2000), '$ a\n'.repeat(20_000));
});

test('retains coalesced content in unterminated strings without re-lexing opposite quotes', { timeout: 60_000 }, () => {
  for (const [opener, line] of [
    ["const html = r'''\n", '<div class="name">text</div>\n'],
    ['const json = """\n', "{'key': 'value'},\n"],
    ["const single = \"unterminated 'quoted' ", 'word '],
    ['const rawSingle = r\'unterminated "quoted" ', 'word '],
  ] as const) {
    const unterminated = `${opener}${line.repeat(10_000)}`;
    expectLinearErrorParse(`${opener}${line.repeat(1000)}`, unterminated);
  }

  for (const [source, tokenType, expectedText] of [
    ["const s = \"hello 'world'\nvoid after() {}", 'template_chars_double_single', "hello 'world'"],
    ['const s = r\'hello "world" $x\nvoid after() {}', 'template_chars_single_single', 'hello "world" $x'],
    ["const s = '''\n<div class=\"name\">text</div>\n", 'template_chars_single', '\n<div class="name">text</div>\n'],
    ['const s = r"""\n{\'key\': $value}\n', 'template_chars_double', "\n{'key': $value}\n"],
  ] as const) {
    const tree = parser.parse(source);
    if (!tree) throw new Error('The parser returned no tree');
    try {
      expect(tree.rootNode.hasError).toBe(true);
      expect(tree.rootNode.descendantsOfType(tokenType).map((node) => node.text)).toEqual([expectedText]);
    } finally {
      tree.delete();
    }
  }

  for (const raw of ['', 'r'] as const) {
    const prefixes = raw === '' ? ['', 'hello', String.raw`\t`, '$x', '${x}'] : ['', 'hello', '\\'];
    for (const quote of ["'", '"'] as const) {
      for (const prefix of prefixes) {
        for (const ending of ['\n', '\r', '\r\n', '\n  ', '\n\n'] as const) {
          const source = `var s = ${raw}${quote}${prefix}${ending}${quote};`;
          const tree = parser.parse(source);
          if (!tree) throw new Error('The parser returned no tree');
          try {
            expect(tree.rootNode.hasError, source).toBe(true);
          } finally {
            tree.delete();
          }
        }
      }
    }
  }
});

function expectLinearErrorParse(small: string, large: string): void {
  parseCpuTime(large);
  parseCpuTime(large);
  let smallFastest = Infinity;
  let largeFastest = Infinity;
  for (let run = 0; run < 5; run++) {
    smallFastest = Math.min(smallFastest, parseCpuTime(small));
    largeFastest = Math.min(largeFastest, parseCpuTime(large));
  }
  expect(largeFastest / smallFastest).toBeLessThan(18);
}

function parseCpuTime(source: string): number {
  const start = process.threadCpuUsage();
  let elapsed = 0;
  let parses = 0;
  // Individual parses can finish within one CPU timer tick on Linux and ARM runners.
  do {
    const tree = parser.parse(source);
    if (!tree) throw new Error('The parser returned no tree');
    const { hasError } = tree.rootNode;
    tree.delete();
    expect(hasError).toBe(true);
    parses++;
    const { system, user } = process.threadCpuUsage(start);
    elapsed = system + user;
  } while (elapsed < 20_000);
  return elapsed / parses;
}
