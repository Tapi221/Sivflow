import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Folder, Tag, X, ChevronDown, Check } from 'lucide-react';
import { useTags, DEFAULT_COLORS } from '@/hooks/useTags';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const { tags: allTags, updateTagColor, addTag } = useTags();
  const { cards = [] } = useCards(); // Get all cards for grouping
  const { folders = [] } = useFolders();
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL'>('ALL');
  
  // Calculate folder tree map for display names
  // Group tags by folder
  const folderTagMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    // Also track 'Unknown' folder
    
    // Iterate through all cards to find usage
    cards.forEach(card => {
       if (card.tags && Array.isArray(card.tags)) {
           card.tags.forEach((tag: string) => {
               const fId = card.folderId || 'UNKNOWN';
               if (!map.has(fId)) {
                   map.set(fId, new Set());
               }
               map.get(fId)!.add(tag);
           });
       }
    });
    
    return map;
  }, [cards]);
  
  // Get list of tags to display based on filter
  const displayedSections = useMemo(() => {
     // Prepare sections: Folder Name -> Tags
     const sections: { folderId: string; folderName: string; tags: string[] }[] = [];
     
     // Helper to get folder name
     const getFolderName = (id: string) => {
         if (id === 'UNKNOWN') return '未分類';
         const f = folders.find(f => (f.id || f.folderId) === id);
         return f ? (f.folderName || 'No Name') : '不明なフォルダ';
     };
     
     if (selectedFolderId === 'ALL') {
         // Show all folders that have tags
         Array.from(folderTagMap.entries()).forEach(([fId, tagSet]) => {
             sections.push({
                 folderId: fId,
                 folderName: getFolderName(fId),
                 tags: Array.from(tagSet).sort()
             });
         });
     } else {
         // Show specific
         if (folderTagMap.has(selectedFolderId)) {
             sections.push({
                 folderId: selectedFolderId,
                 folderName: getFolderName(selectedFolderId),
                 tags: Array.from(folderTagMap.get(selectedFolderId)!).sort()
             });
         }
     }
     
     // Also, we might want to show Global Tags that are NOT used anywhere? 
     // Or just list them under "Unused"?
     // For now, let's stick to the mockup which shows folders. 
     // If a tag is unused, it won't appear here with this logic.
     // Let's add an "All Global Tags" section if needed, but the user asked for "by folder".
     // Actually, let's ensure we display ALL tags somewhere. 
     // Maybe add a section "All Tags (Alphabetical)" if they want? 
     // But the mockup implies folder grouping.
     // Let's stick to folder grouping.
     
     return sections.sort((a, b) => a.folderName.localeCompare(b.folderName));
  }, [folderTagMap, folders, selectedFolderId]);

  // Helper to resolve tag color
  const getTagColor = (tagName: string) => {
      const t = allTags?.find(at => at.name === tagName);
      return t?.color || DEFAULT_COLORS[0];
  };

  // Helper to find root folder ID
  const findRootFolderId = (startFolderId: string) => {
      if (startFolderId === 'UNKNOWN') return ''; // Or handle as global?
      
      let current = folders.find(f => (f.id || f.folderId) === startFolderId);
      while (current && (current.parentFolderId || (current as any).parent_folder_id)) {
          const pId = current.parentFolderId || (current as any).parent_folder_id;
          current = folders.find(f => (f.id || f.folderId) === pId);
      }
      return current?.id || current?.folderId || startFolderId;
  };

  const handleColorChange = async (tagName: string, newColor: string, folderId: string) => {
      const rootId = findRootFolderId(folderId);
      if (!rootId) return;

      // Check if tag entity exists, if not create it
      // Note: We should check existence specifically for this root folder
      const existing = allTags?.find(t => t.name === tagName && t.rootFolderId === rootId);
      
      if (!existing) {
          await addTag(tagName, newColor, rootId);
      } else {
          await updateTagColor(tagName, newColor, rootId);
      }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden bg-[#F8FAFB] border-none rounded-[32px] shadow-2xl">
         <DialogTitle className="sr-only">Tag Management</DialogTitle>
         {/* Header */}
         <div className="p-8 pb-4 bg-white border-b border-slate-50 flex items-center justify-between shrink-0">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                 Tag Management
             </h2>
             
             <div className="flex items-center gap-3">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-600 font-bold text-xs flex items-center gap-2">
                            <Folder className="w-4 h-4 text-slate-400" />
                            {selectedFolderId === 'ALL' ? '全てのフォルダ' : 
                                (folders.find(f => (f.id || f.folderId) === selectedFolderId)?.folderName || 'Selected Folder')
                            }
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem onClick={() => setSelectedFolderId('ALL')} className="font-bold">
                            全てのフォルダ
                        </DropdownMenuItem>
                        {folders.map(f => (
                            <DropdownMenuItem key={f.id || f.folderId} onClick={() => setSelectedFolderId(f.id || f.folderId)}>
                                {f.folderName}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                 </DropdownMenu>
                 
             </div>
         </div>
         
         {/* Content */}
         <div className="flex-1 overflow-y-auto p-8 space-y-10">
             {displayedSections.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                     <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p>タグが見つかりません</p>
                 </div>
             ) : (
                 displayedSections.map(section => (
                     <div key={section.folderId} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="flex items-center gap-2 mb-4 text-primary-600">
                              <Folder className="w-5 h-5" />
                              <h3 className="font-bold text-lg">{section.folderName}</h3>
                          </div>
                         
                         <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-50/50 space-y-1">
                             {section.tags.map(tag => {
                                 const currentColor = getTagColor(tag);
                                 return (
                                     <div key={tag} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors group">
                                         {/* Tag Preview */}
                                         <div className={cn(
                                             "px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1.5 ml-2 transition-all", 
                                             currentColor
                                         )}>
                                             <Tag className="w-3.5 h-3.5 opacity-70" />
                                             {tag}
                                         </div>
                                         
                                         {/* Color Palette */}
                                         <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                             {DEFAULT_COLORS.slice(0, 8).map(color => (
                                                 <button
                                                     key={color}
                                                     onClick={() => handleColorChange(tag, color, section.folderId)}
                                                     className={cn(
                                                         "w-6 h-6 rounded-full border transition-all hover:scale-110",
                                                         color.split(' ')[0], // bg class
                                                         color.split(' ')[2], // border class
                                                         currentColor === color ? "ring-2 ring-offset-2 ring-slate-300 scale-110 opacity-100" : "opacity-50 hover:opacity-100"
                                                     )}
                                                 >
                                                     {currentColor === color && <Check className="w-3 h-3 mx-auto text-slate-600/50" />}
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 ))
             )}
         </div>
         
      </DialogContent>
    </Dialog>
  );
}
