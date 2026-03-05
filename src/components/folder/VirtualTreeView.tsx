import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderTree } from '@/ui/icons';
import { cn } from '@/lib/utils';
import type { Card, SelectedExplorerItem } from '@/types';
import type { TreeNode } from './viewTypes';
import { ExplorerRow } from './explorer/rows/ExplorerRow';
import { ExplorerRowContent } from './explorer/rows/ExplorerRowContent';

interface VirtualTreeViewProps {
  nodes: TreeNode[];
  cards: Card[];
  selectedItem: SelectedExplorerItem;
  onItemSelect: (item: SelectedExplorerItem) => void;
}

const getCardTitle = (card: Card): string => {
  if (typeof card.title === 'string' && card.title.trim()) return card.title;
  if (typeof card.questionText === 'string' && card.questionText.trim()) {
    const plain = card.questionText.replace(/<[^>]*>/g, '').trim();
    if (plain) return plain.length > 50 ? `${plain.slice(0, 50)}...` : plain;
  }
  return '無題のカード';
};

export function VirtualTreeView({ nodes, cards, selectedItem, onItemSelect }: VirtualTreeViewProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const cardById = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) map.set(card.id, card);
    return map;
  }, [cards]);

  useEffect(() => {
    const ancestorIds = new Set<string>();

    const visit = (entries: TreeNode[], path: string[]) => {
      for (const entry of entries) {
        if (entry.type === 'card') {
          if (selectedItem?.type === 'card' && selectedItem.id === entry.cardId) {
            for (const ancestorId of path) ancestorIds.add(ancestorId);
          }
          continue;
        }
        visit(entry.children, [...path, entry.id]);
      }
    };

    visit(nodes, []);
    if (ancestorIds.size === 0) return;

    setExpandedGroupIds((prev) => new Set([...prev, ...ancestorIds]));
  }, [nodes, selectedItem]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === 'card') {
      const card = cardById.get(node.cardId);
      if (!card) return null;
      const isSelected = selectedItem?.type === 'card' && selectedItem.id === node.cardId;
      return (
        <ExplorerRow
          key={node.id}
          depth={depth + 1}
          selected={isSelected}
          className={cn('pr-2 cursor-pointer')}
          onClick={() => onItemSelect({ type: 'card', id: node.cardId })}
        >
          <div className="flex h-full min-w-0 flex-1 items-center pr-1">
            <BookOpen className={cn('sidebar-icon mr-1 h-4 w-4 shrink-0 text-[#6E6E80]', isSelected && 'text-primary-700')} />
            <ExplorerRowContent
              title={getCardTitle(card)}
              titleClassName={cn(
                'lining-nums tabular-nums',
                isSelected ? 'font-medium text-primary-700' : 'text-[#202123]'
              )}
            />
          </div>
        </ExplorerRow>
      );
    }

    const isExpanded = expandedGroupIds.has(node.id);
    return (
      <div key={node.id}>
        <ExplorerRow
          depth={depth}
          className="pr-2 cursor-pointer"
          onClick={() => toggleGroup(node.id)}
        >
          <div className="flex h-full min-w-0 flex-1 items-center pr-1">
            <div className="mr-0 flex h-4 w-4 flex-shrink-0 items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="sidebar-icon h-4 w-4 text-[#6E6E80]" />
              ) : (
                <ChevronRight className="sidebar-icon h-4 w-4 text-[#6E6E80]" />
              )}
            </div>
            <FolderTree className="sidebar-icon mr-0 h-4 w-4 flex-shrink-0 text-[#6E6E80]" />
            <ExplorerRowContent
              title={node.label}
              titleClassName="font-medium text-[#202123] lining-nums tabular-nums"
            />
          </div>
        </ExplorerRow>
        {isExpanded ? <div>{node.children.map((child) => renderNode(child, depth + 1))}</div> : null}
      </div>
    );
  };

  if (nodes.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
          表示できるタグがありません。
        </div>
      </div>
    );
  }

  return <div className="space-y-0.5 p-2">{nodes.map((node) => renderNode(node, 0))}</div>;
}
