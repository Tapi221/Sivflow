import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectMap } from '@/hooks/useProjectMap';
import { createPageUrl } from '@/utils';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Calendar from 'lucide-react/dist/esm/icons/calendar';

export default function MapList({ folderId, totalCardCount = 0 }) {
  const navigate = useNavigate();
  const { maps, loading, createMap, updateMap, deleteMap } = useProjectMap(folderId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapName, setMapName] = useState('');

  const canCreateMap = totalCardCount >= 2;

  const handleCreate = async () => {
    if (!canCreateMap) {
        alert('マップを作成するには、カードが2枚以上必要です。');
        return;
    }
    if (!mapName.trim()) return;
    try {
      await createMap({
        folderId,
        name: mapName,
        nodes: []
      });
      setIsCreateOpen(false);
      setMapName('');
    } catch (error) {
      console.error('Failed to create map:', error);
      alert('マップの作成に失敗しました');
    }
  };

  const handleRename = async () => {
    if (!selectedMap || !mapName.trim()) return;
    try {
      await updateMap(selectedMap.id, { name: mapName });
      setIsRenameOpen(false);
      setSelectedMap(null);
      setMapName('');
    } catch (error) {
      console.error('Failed to rename map:', error);
      alert('マップ名の変更に失敗しました');
    }
  };

  const handleDelete = async (map) => {
    if (!confirm(`マップ「${map.name}」を削除してもよろしいですか？`)) return;
    try {
        await deleteMap(map.id);
    } catch (error) {
        console.error('Failed to delete map:', error);
        alert('マップの削除に失敗しました');
    }
  };

  const openRenameDialog = (map) => {
    setSelectedMap(map);
    setMapName(map.name);
    setIsRenameOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading maps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-primary-600" />
            マップ一覧
        </h3>
        <Button 
            onClick={() => { setMapName(''); setIsCreateOpen(true); }}
            disabled={!canCreateMap}
            className={!canCreateMap ? "opacity-50 cursor-not-allowed" : ""}
            title={!canCreateMap ? "カードが2枚以上必要です" : ""}
        >
          <Plus className="w-4 h-4 mr-2" />
          新規マップ作成
        </Button>
      </div>
      {!canCreateMap && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800">
             <div className="bg-amber-100 p-1 rounded-full mt-0.5">
                <MapIcon className="w-4 h-4 text-amber-600" />
             </div>
             <div>
                 <span className="font-bold block mb-1">マップ機能の利用条件</span>
                 マップを作成するには、このフォルダ（またはサブフォルダ）にカードが合計2枚以上必要です。<br/>
                 現在のカード数: <span className="font-bold">{totalCardCount}枚</span>
             </div>
          </div>
      )}

      {maps.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
           <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
               <MapIcon className="w-8 h-8 text-primary-600" />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-2">まだマップがありません</h3>
           <p className="text-slate-500 text-sm max-w-md mb-6">
               このフォルダにはまだマップが作成されていません。
               「新規マップ作成」から最初のマップを作りましょう。
           </p>
           <Button 
               className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold px-8 h-12 rounded-full flex items-center gap-2"
               onClick={() => { setMapName(''); setIsCreateOpen(true); }}
               disabled={!canCreateMap}
           >
               <Plus className="w-4 h-4" />
               マップを作成する
           </Button>
           {!canCreateMap && (
               <p className="text-xs text-amber-600 font-bold mt-4 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                   ※ カードをあと{2 - totalCardCount}枚追加してください
               </p>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <Card 
                key={map.id} 
                className="group cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-primary-200"
                onClick={() => navigate(createPageUrl(`WorldMap?folderId=${folderId}&mapId=${map.id}`))}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                  <MapIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 truncate mb-1 group-hover:text-primary-600 transition-colors">
                    {map.name}
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {map.updatedAt ? new Date(map.updatedAt).toLocaleDateString() : '不明'}
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRenameDialog(map)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          名前を変更
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => handleDelete(map)}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規マップ作成</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="mapName" className="mb-2 block">マップ名</Label>
            <Input 
                id="mapName" 
                value={mapName} 
                onChange={(e) => setMapName(e.target.value)} 
                placeholder="例: 基本概念図"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreate}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>マップ名の変更</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="renameMapName" className="mb-2 block">マップ名</Label>
            <Input 
                id="renameMapName" 
                value={mapName} 
                onChange={(e) => setMapName(e.target.value)} 
                placeholder="マップ名を入力"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>キャンセル</Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
