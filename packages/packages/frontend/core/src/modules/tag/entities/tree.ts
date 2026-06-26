export type TagTreeNode<T extends { id: string; parentId?: string }> = T & {
  children: TagTreeNode<T>[];
};

export type FlattenedTagTreeNode<T extends { id: string; parentId?: string }> =
  T & {
    depth: number;
    hasChildren: boolean;
    collapsed: boolean;
  };

export function buildTagTree<T extends { id: string; parentId?: string }>(
  tags: T[]
): TagTreeNode<T>[] {
  const map = new Map<string, TagTreeNode<T>>();

  for (const tag of tags) {
    map.set(tag.id, { ...tag, children: [] });
  }

  const roots: TagTreeNode<T>[] = [];

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function flattenTagTree<T extends { id: string; parentId?: string }>(
  nodes: TagTreeNode<T>[],
  depth = 0,
  collapsedIds?: ReadonlySet<string>
): FlattenedTagTreeNode<T>[] {
  return nodes.flatMap(node => {
    const { children, ...tag } = node;
    const collapsed = collapsedIds?.has(node.id) ?? false;
    return [
      {
        ...(tag as unknown as T),
        depth,
        hasChildren: children.length > 0,
        collapsed,
      },
      ...(collapsed ? [] : flattenTagTree(children, depth + 1, collapsedIds)),
    ];
  });
}

export function filterTagTree<T extends { id: string; parentId?: string }>(
  nodes: TagTreeNode<T>[],
  predicate: (node: T) => boolean
): TagTreeNode<T>[] {
  return nodes.flatMap(node => {
    const children = filterTagTree(node.children, predicate);
    if (!predicate(node) && children.length === 0) {
      return [];
    }
    return [{ ...node, children }];
  });
}

export function getDescendantTagIds(
  tags: { id: string; parentId?: string }[],
  tagId: string
): string[] {
  const childrenByParent = new Map<string, string[]>();

  for (const tag of tags) {
    if (!tag.parentId) continue;
    childrenByParent.set(tag.parentId, [
      ...(childrenByParent.get(tag.parentId) ?? []),
      tag.id,
    ]);
  }

  const descendants: string[] = [];
  const queue = [...(childrenByParent.get(tagId) ?? [])];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId || descendants.includes(childId)) continue;
    descendants.push(childId);
    queue.push(...(childrenByParent.get(childId) ?? []));
  }

  return descendants;
}
