import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card, SelectedExplorerItem } from '@/types';
import type { TreeNode } from './viewTypes';

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
        <button
          key={node.id}
          type="button"
          className={cn(
            'flex h-8 w-full items-center rounded-md pr-2 text-left transition-colors hover:bg-slate-100',
            isSelected && 'bg-primary-100/80'
          )}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
          onClick={() => onItemSelect({ type: 'card', id: node.cardId })}
        >
          <BookOpen className={cn('mr-2 h-4 w-4 shrink-0 text-slate-400', isSelected && 'text-primary-600')} />
          <span className={cn('truncate text-sm text-slate-600', isSelected && 'font-medium text-primary-700')}>
            {getCardTitle(card)}
          </span>
        </button>
      );
    }

    const isExpanded = expandedGroupIds.has(node.id);
    return (
      <div key={node.id}>
        <button
          type="button"
          className="flex h-8 w-full items-center rounded-md pr-2 text-left transition-colors hover:bg-slate-100"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          onClick={() => toggleGroup(node.id)}
        >
          {isExpanded ? <ChevronDown className="mr-1 h-4 w-4 text-slate-400" /> : <ChevronRight className="mr-1 h-4 w-4 text-slate-400" />}
          <FolderTree className="mr-2 h-4 w-4 text-slate-400" />
          <span className="truncate text-sm font-medium text-slate-700">{node.label}</span>
        </button>
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
