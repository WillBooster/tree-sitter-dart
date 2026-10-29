import type { Node } from '@willbooster/web-tree-sitter';
import { expect } from 'vitest';

export function checkFollowing(root: Node): void {
  const declaration = root.namedChildren.at(-1)!;
  expect(declaration.type).toBe('function_declaration');
  expect(declaration.childForFieldName('signature')!.childForFieldName('name')!.text).toBe('following');
}
