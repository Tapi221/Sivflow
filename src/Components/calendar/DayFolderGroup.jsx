import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

export default function DayFolderGroup({ 
  cards = [], 
  folders = [], 
  viewType = 'month',
  dateStr,
  studiedCardIds = new Set()
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group cards by folder
  const cardsByFolder = cards.reduce((acc, card) => {
    const folderId = card.folderId || card.folder_id || 'uncategorized';
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(card);
    return acc;
  }, {});

  const sortedFolderIds = Object.keys(cardsByFolder).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    const folderA = folders.find(f => f.id === a);
    const folderB = folders.find(f => f.id === b);
    return (folderA?.folderName || '').localeCompare(folderB?.folderName || '');
  });

  if (viewType === 'month') {
    // Month View: Compact Summary
    return (
      <div className="space-y-1 mt-1">
        {sortedFolderIds.map(folderId => {
          const folderCards = cardsByFolder[folderId];
          const folder = folders.find(f => f.id === folderId);
          const folderName = folder?.folderName || folder?.folder_name || '未分類';
          const count = folderCards.length;
          
          // Determine color based on folder tags or default
          // For now, use a simple dot color or folder color logic if available
          
          return (
            <div 
              key={folderId}
              className="flex items-center gap-1 text-[10px] text-slate-600 truncate px-1 py-0.5 rounded hover:bg-slate-100"
              title={`${folderName}: ${count}枚`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
              <div className="truncate flex-1 font-medium">{folderName}</div>
              <div className="font-bold text-slate-400">{count}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Week & Day View: Expandable
  return (
    <div className="space-y-2">
      {sortedFolderIds.map(folderId => {
        const folderCards = cardsByFolder[folderId];
        const folder = folders.find(f => f.id === folderId);
        const folderName = folder?.folderName || folder?.folder_name || '未分類';
        const count = folderCards.length;
        const isFolderExpanded = isExpanded === folderId; // Simple local state for specific folder? Or generic?
        // Let's use a local state map or just toggle.
        // Actually, let's wrap each folder in a sub-component to handle its own expansion to make it cleaner.
        // Or just map here.
        
        return (
          <FolderGroupItem 
            key={folderId}
            folderId={folderId}
            folderName={folderName}
            cards={folderCards}
            viewType={viewType}
            studiedCardIds={studiedCardIds}
          />
        );
      })}
    </div>
  );
}

function FolderGroupItem({ folderId, folderName, cards, viewType, studiedCardIds }) {
  const [expanded, setExpanded] = useState(false);
  
  const total = cards.length;
  const studiedCount = cards.filter(c => studiedCardIds.has(c.id)).length;
  const isAllStudied = total > 0 && total === studiedCount;

  return (
    <div className={cn(
      "border border-slate-100 rounded-lg overflow-hidden transition-all",
      expanded ? "bg-white shadow-sm ring-1 ring-slate-200" : "bg-white/50 hover:bg-white hover:shadow-sm"
    )}>
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-2 cursor-pointer select-none",
          isAllStudied && "opacity-60"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
          <FolderIcon className="w-3 h-3 text-primary-600" />
          <span className="text-xs font-bold text-slate-700 truncate">{folderName}</span>
        </div>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 shadow-none border-none">
          {studiedCount}/{total}
        </Badge>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-2 pt-0 space-y-1 animate-in slide-in-from-top-1 duration-200">
          {cards.map((card, index) => {
             const isStudied = studiedCardIds.has(card.id);
             return (
                 <div key={card.id}> 
                     {/* Use DraggableCard if we need DND, but native Calendar.jsx uses DraggableCard only in Month view? 
                         Wait, the original code used DraggableCard in month view which had droppable zones.
                         In week/day view, it was just rendering divs.
                         Requirements don't explicitly ask for DND.
                         Also DND inside an expandable list might be tricky with Droppable parents.
                         If I'm in Month view, I'm returning summary.
                         If I'm in Week/Day, I'm returning expandable list. 
                         Calendar.jsx Week view seems to be just display.
                         I'll stick to display components for cards in Week/Day for now, 
                         consistent with previous WeekView implementation but slightly nicer.
                     */}
                    <div
                        className={cn(
                          "text-xs p-2 rounded-md border flex items-center justify-between gap-2",
                          isStudied ? "bg-slate-50 text-slate-400 border-transparent" : "bg-white border-slate-100 text-slate-600"
                        )}
                      >
                        <span className="truncate">{card.title || card.question_text?.substring(0, 20)}</span>
                        {isStudied && <span className="text-[9px] font-bold text-primary-600">DONE</span>}
                    </div>
                 </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
