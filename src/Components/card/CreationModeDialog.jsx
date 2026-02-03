import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, MessageSquare, List, Layers, ArrowUpDown, ChevronRight, FileText, FileX } from 'lucide-react';

/**
 * 作成モードを選択するダイアログ
 */
export default function CreationModeDialog({ open, onOpenChange, onSelectMode, onBack }) {
  const [selectedMainMode, setSelectedMainMode] = useState(null);

  const modes = [
    {
      id: 'qa',
      title: '一問一答',
      description: 'シンプルに表面と裏面を入力します',
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-50',
      hasOptions: true
    },
    {
      id: 'choice',
      title: '4択問題',
      description: '正解と不正解の選択肢を作成します',
      icon: <List className="w-5 h-5 text-green-500" />,
      color: 'bg-green-50'
    },
    {
      id: 'multi',
      title: '多答問題',
      description: '複数の正解がある問題を作成します',
      icon: <Layers className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-50'
    },
    {
      id: 'sort',
      title: '並び替え',
      description: '正しい順序に並べ替える問題を作成します',
      icon: <ArrowUpDown className="w-5 h-5 text-orange-500" />,
      color: 'bg-orange-50'
    }
  ];

  const handleBack = () => {
    if (selectedMainMode) {
      setSelectedMainMode(null);
    } else {
      onBack();
    }
  };

  const handleOpenChange = (val) => {
    if (!val) {
      setSelectedMainMode(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0 text-left mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-slate-500 hover:text-slate-800 -ml-2 h-8 w-8"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <DialogTitle className="text-xl">
              {selectedMainMode === 'qa' ? '一問一答の設定' : '作成モード選択'}
            </DialogTitle>
            <DialogDescription>
              {selectedMainMode === 'qa' 
                ? 'タイトルの有無を選択してください' 
                : '作成したいカードの形式を選んでください'}
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {!selectedMainMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  if (mode.hasOptions) {
                    setSelectedMainMode(mode.id);
                  } else {
                    onSelectMode(mode.id);
                  }
                }}
                className="flex items-center p-4 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-slate-50 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${mode.color} flex items-center justify-center mr-3 shrink-0 transition-transform group-hover:scale-110`}>
                  {mode.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base text-slate-800 mb-1 group-hover:text-primary-600 transition-colors flex items-center justify-between">
                    {mode.title}
                    {mode.hasOptions && <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {mode.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => onSelectMode('qa', { hideTitle: false })}
              className="group flex items-center p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">タイトルあり</h3>
                <p className="text-xs text-slate-500">
                  各カードに固有のタイトルを付けます
                </p>
              </div>
            </button>

            <button
              onClick={() => onSelectMode('qa', { hideTitle: true })}
              className="group flex items-center p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <FileX className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">タイトルなし</h3>
                <p className="text-xs text-slate-500">
                  タイトルを省略して効率的に作成します
                </p>
              </div>
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
