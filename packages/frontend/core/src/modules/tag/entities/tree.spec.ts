import { describe, expect, test } from 'vitest';

import {
  buildTagTree,
  filterTagTree,
  flattenTagTree,
  getDescendantTagIds,
} from './tree';

const tags = [
  { id: 'work', name: 'Work' },
  { id: 'project', name: 'Project', parentId: 'work' },
  { id: 'task', name: 'Task', parentId: 'project' },
  { id: 'personal', name: 'Personal' },
];

describe('tag tree utilities', () => {
  test('builds roots and nested children from parent ids', () => {
    const tree = buildTagTree(tags);

    expect(tree.map(tag => tag.id)).toEqual(['work', 'personal']);
    expect(tree[0].children.map(tag => tag.id)).toEqual(['project']);
    expect(tree[0].children[0].children.map(tag => tag.id)).toEqual(['task']);
  });

  test('flattens a tree with depth metadata', () => {
    const flattened = flattenTagTree(buildTagTree(tags));

    expect(flattened.map(tag => [tag.id, tag.depth])).toEqual([
      ['work', 0],
      ['project', 1],
      ['task', 2],
      ['personal', 0],
    ]);
    expect(
      flattened.map(tag => [tag.id, tag.hasChildren, tag.collapsed])
    ).toEqual([
      ['work', true, false],
      ['project', true, false],
      ['task', false, false],
      ['personal', false, false],
    ]);
  });

  test('flattens a tree with collapsed branches hidden', () => {
    const flattened = flattenTagTree(buildTagTree(tags), 0, new Set(['work']));

    expect(flattened.map(tag => [tag.id, tag.depth, tag.collapsed])).toEqual([
      ['work', 0, true],
      ['personal', 0, false],
    ]);
  });

  test('filters a tree while preserving matching ancestors', () => {
    const filtered = flattenTagTree(
      filterTagTree(buildTagTree(tags), tag => tag.name.includes('Task'))
    );

    expect(filtered.map(tag => [tag.id, tag.depth])).toEqual([
      ['work', 0],
      ['project', 1],
      ['task', 2],
    ]);
  });

  test('returns all descendant tag ids', () => {
    expect(getDescendantTagIds(tags, 'work')).toEqual(['project', 'task']);
    expect(getDescendantTagIds(tags, 'project')).toEqual(['task']);
    expect(getDescendantTagIds(tags, 'personal')).toEqual([]);
  });
});
