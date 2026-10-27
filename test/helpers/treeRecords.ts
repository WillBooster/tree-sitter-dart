import type { Node, QueryCapture, QueryMatch } from '@willbooster/web-tree-sitter';
import { expect } from 'vitest';

export function checkFollowing(root: Node): void {
  const declaration = root.namedChildren.at(-1)!;
  expect(declaration.type).toBe('function_declaration');
  expect(declaration.childForFieldName('signature')!.childForFieldName('name')!.text).toBe('following');
}

export function nodeRecord(node: Node): unknown[] {
  return [
    node.type,
    node.isNamed,
    node.isMissing,
    node.hasError,
    node.startIndex,
    node.endIndex,
    node.startPosition,
    node.endPosition,
    node.children.map((child, index) => [node.fieldNameForChild(index), nodeRecord(child)]),
  ];
}

export function matchRecord(match: QueryMatch): Record<string, unknown> {
  const { captures, ...metadata } = match;
  return { ...metadata, captures: captures.map(captureRecord) };
}

export function captureRecord(capture: QueryCapture): Record<string, unknown> {
  const { node, ...metadata } = capture;
  return {
    ...metadata,
    node: {
      type: node.type,
      text: node.text,
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      startPosition: node.startPosition,
      endPosition: node.endPosition,
      isNamed: node.isNamed,
      isMissing: node.isMissing,
      hasError: node.hasError,
    },
  };
}
