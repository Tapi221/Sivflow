// @ts-nocheck
import * as React from "react"
import { Check, Plus, X, ChevronsUpDown, Tag as TagIcon, Palette, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/Components/ui/badge"
import { Button } from "@/Components/ui/button"
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/Components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/Components/ui/popover"
import { useTags } from "@/hooks/useTags"

interface TagInputProps {
  tags: string[]
  availableTags?: string[] 
  rootFolderId?: string
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export function TagInput({ 
  tags = [], 
  onChange, 
  placeholder = "タグを選択...", 
  className,
  rootFolderId
}: TagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null)
  
  const { tags: allTags, availableColors, addTag, getTagColor } = useTags(rootFolderId);

  const handleUnselect = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSelect = (tag: string) => {
    if (tags.includes(tag)) {
      handleUnselect(tag)
    } else {
      onChange([...tags, tag])
    }
  }

  const handleCreateTag = async () => {
    const trimmed = inputValue.trim()
    if (trimmed && !tags.includes(trimmed)) {
      if (rootFolderId) {
          await addTag(trimmed, selectedColor || availableColors[0], rootFolderId);
      }
      onChange([...tags, trimmed])
      setInputValue("")
      setSelectedColor(null)
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(tags);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange(items);
  };
  
  const uniqueTags = React.useMemo(() => {
     return allTags ? allTags.map(t => t.name).sort() : [];
  }, [allTags]);

  const filteredTags = uniqueTags.filter(tag => 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "w-full flex flex-col min-h-[48px] py-1.5 px-3 bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl transition-all cursor-text",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-1.5 w-full items-center">
             <DragDropContext onDragEnd={handleDragEnd}>
                 <Droppable droppableId="tags-list" direction="horizontal">
                     {(provided) => (
                         <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className="flex flex-wrap gap-1.5"
                         >
                             {tags.map((tag, index) => {
                                 const colorClass = getTagColor(tag, rootFolderId);
                                 return (
                                     <Draggable key={tag} draggableId={tag} index={index}>
                                         {(provided, snapshot) => (
                                             <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{ ...provided.draggableProps.style }}
                                             >
                                                <Badge 
                                                    variant="secondary" 
                                                    className={cn(
                                                        "pl-1.5 pr-1 py-0.5 flex items-center gap-1 border-none shadow-sm select-none transition-all font-bold text-[10px]", 
                                                        colorClass,
                                                        snapshot.isDragging && "scale-105 shadow-md z-50"
                                                    )}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    {tag}
                                                    <div
                                                        className="ml-1 rounded-full hover:bg-black/5 p-0.5 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleUnselect(tag)
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </div>
                                                </Badge>
                                             </div>
                                         )}
                                     </Draggable>
                                 );
                             })}
                             {provided.placeholder}
                         </div>
                     )}
                 </Droppable>
             </DragDropContext>
             
             <PopoverTrigger asChild>
                 <button 
                    className="flex items-center gap-1 h-7 px-2 text-slate-300 hover:text-slate-500 transition-colors"
                    onClick={() => setOpen(true)}
                 >
                     {tags.length === 0 && <span className="text-[10px] font-bold uppercase tracking-wider">{placeholder}</span>}
                     {tags.length > 0 && <Plus className="w-3.5 h-3.5" />}
                 </button>
             </PopoverTrigger>
        </div>
      </div>
      <PopoverContent className="w-[320px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden" align="start">
        <Command 
          className="bg-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) {
              // もし既存のタグに一致するものがない新規タグなら作成・追加する
              const exists = uniqueTags.some(t => t.toLowerCase() === inputValue.trim().toLowerCase());
              if (!exists) {
                e.preventDefault();
                handleCreateTag();
              }
            }
          }}
        >
          <div className="p-3 border-b border-slate-50">
            <CommandInput 
              placeholder="タグを検索・作成..." 
              value={inputValue}
              onValueChange={setInputValue}
              className="h-9 bg-slate-50 border-none rounded-lg focus:ring-0"
            />
          </div>
          <CommandList className="max-h-[350px]">
            {inputValue && !uniqueTags.some(t => t.toLowerCase() === inputValue.toLowerCase()) && (
               <div className="p-3 space-y-3">
                  <div 
                      className="flex items-center gap-2 p-2 rounded-xl bg-primary-50 text-primary-600 cursor-pointer text-xs font-bold transition-all hover:bg-primary-100"
                      onClick={handleCreateTag}
                  >
                      <Plus className="w-4 h-4" />
                      「{inputValue}」を新しく作成
                  </div>
                  
                  <div className="px-1">
                      <div className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Palette className="w-3 h-3" /> カラーを選択
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {availableColors.map((color) => (
                              <button
                                  key={color}
                                  title={`${color.split(' ')[0]}を選択`}
                                  aria-label={`${color.split(' ')[0]}を選択`}
                                  className={cn(
                                      "w-6 h-6 rounded-full border border-slate-100 transition-all",
                                      color.split(' ')[0],
                                      (selectedColor === color || (!selectedColor && color === availableColors[0])) ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "hover:scale-110"
                                  )}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedColor(color);
                                  }}
                              />
                          ))}
                      </div>
                  </div>
               </div>
            )}

            <CommandGroup heading={<span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-2">既存のタグ</span>}>
              {filteredTags.length === 0 && !inputValue && (
                <div className="py-6 text-center">
                  <TagIcon className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">タグがありません</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 p-1">
                {filteredTags.map((tag) => {
                   const colorClass = getTagColor(tag, rootFolderId);
                   const isSelected = tags.includes(tag);
                   return (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => handleSelect(tag)}
                        className={cn(
                          "flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-all border border-transparent",
                          isSelected ? "bg-primary-50/30 border-primary-100/50" : "hover:bg-slate-50"
                        )}
                      >
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "px-2 py-0.5 border-none shadow-sm font-bold text-[10px]", 
                            colorClass
                          )}
                        >
                          {tag}
                        </Badge>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                      </CommandItem>
                   );
                })}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
