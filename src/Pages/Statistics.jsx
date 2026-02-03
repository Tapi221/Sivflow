import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { 
  BarChart3, 
  Folder, 
  Brain, 
  CheckCircle2, 
  Share2, 
  Zap, 
  Calculator,
  ChevronRight,
  ChevronDown,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
  Tag,
  Frown,
  Meh,
  Smile,
  Laugh
} from 'lucide-react';
import { FaceIcons } from '@/Components/ui/FaceIcons';
import { StabilityDistributionChart } from '@/Components/stats/StatsCharts';
import { createPageUrl } from '@/utils';
import { normalizeMemoryStability } from '@/utils/reviewUtils';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useUserSettings } from '@/hooks/useUserSettings';
import { localDb } from '@/services/localDB';
import { cn } from '@/lib/utils';

// --- Constants ---
const DUMMY_BUCKETS = [
  { range: '0-5%', count: 1, min: 0, max: 5 }, { range: '5-10%', count: 2, min: 5, max: 10 },
  { range: '10-15%', count: 3, min: 10, max: 15 }, { range: '15-20%', count: 5, min: 15, max: 20 },
  { range: '20-25%', count: 8, min: 20, max: 25 }, { range: '25-30%', count: 12, min: 25, max: 30 },
  { range: '30-35%', count: 18, min: 30, max: 35 }, { range: '35-40%', count: 24, min: 35, max: 40 },
  { range: '40-45%', count: 28, min: 40, max: 45 }, { range: '45-50%', count: 22, min: 45, max: 50 },
  { range: '50-55%', count: 16, min: 50, max: 55 }, { range: '55-60%', count: 10, min: 55, max: 60 },
  { range: '60-65%', count: 6, min: 60, max: 65 }, { range: '65-70%', count: 4, min: 65, max: 70 },
  { range: '70-75%', count: 3, min: 70, max: 75 }, { range: '75-80%', count: 2, min: 75, max: 80 },
  { range: '80-85%', count: 1, min: 80, max: 85 }, { range: '85-90%', count: 1, min: 85, max: 90 },
  { range: '90-95%', count: 0, min: 90, max: 95 }, { range: '95-100%', count: 0, min: 95, max: 100 }
];

const EMPTY_STATE_TEXT = {
    title: "学習を始めると、ここに成長が現れます",
    description: "単語カードを復習することで、\n記憶の安定度が分布として可視化されます。",
    note: "続けるほど、右側（安定・長期保持）に移動していきます。"
};

// --- Sub-components (could be moved to separate files later) ---

const ProgressBar = ({ label, value, total, color = 'var(--color-primary-600)', showCount = true }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="space-y-2 w-full">
            <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-600 tracking-tight">{label}</div>
                {showCount && (
                    <div className="text-xs font-bold text-slate-600">
                        {value} / {total}
                    </div>
                )}
            </div>
            <div className="w-full h-1.5 bg-slate-100/50 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                ></div>
            </div>
        </div>
    );
};

const AlgorithmPanel = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="bg-white rounded-2xl md:rounded-[24px] p-5 md:p-8 border border-slate-50 shadow-sm mb-6 md:mb-8 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative text-slate-700">
            <div className="flex items-center justify-between mb-8 md:mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f0f9ff] flex items-center justify-center text-primary-600">
                        <Info className="w-4 h-4 text-[#0ea5e9]" />
                    </div>
                    <h2 className="text-base font-bold text-slate-700">記憶の仕組みについて</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center gap-2 h-9 px-4 font-bold text-xs transition-colors">
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    <span>閉じる</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
                {/* Rate */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-primary-600" />
                        現在の定着状況
                    </div>
                    <div className="text-sm font-bold text-slate-700 leading-relaxed">
                        今、テストをしたらどれくらい正解できるかの予測値です。学習が進むにつれてこの数値は上がっていきます。
                    </div>
                </div>

                {/* Decay */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <TrendingDown className="w-3 h-3 text-[#f59e0b]" />
                        忘却のシミュレーション
                    </div>
                    <div className="text-sm font-bold text-slate-700 leading-relaxed">
                       人間の脳は時間とともに記憶を忘れていきます。システムはあなたの記憶が薄れるタイミングを計算し、忘れる直前に通知します。
                    </div>
                </div>

                {/* Interval */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Activity className="w-3 h-3 text-[#8b5cf6]" />
                        最適な復習タイミング
                    </div>
                    <div className="text-sm font-bold text-slate-700 leading-relaxed">
                        「正解」するたびに記憶は強固になり、次回の復習までの期間が伸びていきます。最小の努力で最大の記憶効果を狙います。
                    </div>
                </div>
            </div>

            {/* Change in Stability */}
            <div className="space-y-8">
                <div className="text-xs font-bold text-slate-400 tracking-tight border-b border-slate-100 pb-2">
                    回答によるスケジュールの変化
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: '忘れた', color: '#FF5A65', bg: '#FFF5F6', border: '#FFE4E6', desc: '弱点としてマークし、すぐに再復習します', Icon: FaceIcons.Forgot },
                        { label: 'あいまい', color: '#F9A825', bg: '#FFFBF0', border: '#FFF3D6', desc: '復習間隔を短くして、記憶を補強します', Icon: FaceIcons.Vague },
                        { label: 'OK', color: '#00A3FF', bg: '#F0F9FF', border: '#E0F2FE', desc: '記憶が定着しました。間隔を少し広げます', Icon: FaceIcons.Good },
                        { label: '余裕', color: '#00B67A', bg: '#EEFDF6', border: '#DCFCE7', desc: '完全に詳細まで覚えています。間隔を大幅に広げます', Icon: FaceIcons.Easy },
                    ].map(item => (
                        <div key={item.label} className="p-4 md:p-6 rounded-2xl md:rounded-[20px] flex md:flex-col items-center gap-3 md:text-center border transition-all hover:shadow-md h-full" style={{ backgroundColor: item.bg, borderColor: item.border }}>
                            <div className="flex items-center justify-center mb-0 md:mb-1 shrink-0">
                                <item.Icon size={24} />
                            </div>
                            <div className="flex flex-col md:items-center">
                                <div className="text-sm font-extrabold" style={{ color: item.color }}>{item.label}</div>
                                <div className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed mt-0 md:mt-auto">
                                    {item.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function Statistics() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [isAlgoPanelOpen, setIsAlgoPanelOpen] = useState(false);
  
  const { cards: allCards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { settings } = useUserSettings();

  const cards = useMemo(() => {
    return allCards.filter(c => {
      if (c.isDraft || c.isDeleted) return false;
      const folderId = c.folderId || c.folder_id;
      const folder = folders.find(f => (f.id === folderId || f.folderId === folderId));
      if (folder?.isHidden || folder?.is_hidden) return false;
      return true;
    });
  }, [allCards, folders]);

  const filteredCards = useMemo(() => {
    if (selectedFolderId === 'all') return cards;
    
    const getDescendants = (parentId) => {
        const children = folders.filter(f => f.parentFolderId === parentId || f.parent_folder_id === parentId);
        let ids = [parentId];
        children.forEach(child => ids = [...ids, ...getDescendants(child.id || child._id)]);
        return ids;
    };
    
    const targetIds = getDescendants(selectedFolderId);
    return cards.filter(c => targetIds.includes(c.folderId));
  }, [cards, selectedFolderId, folders]);

  const isLoading = cardsLoading || foldersLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] p-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-[32px]" />)}
        </div>
        <Skeleton className="h-[600px] rounded-[40px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto p-4 md:p-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 flex items-center justify-center text-primary-600">
                        <BarChart3 className="w-5.5 h-5.5" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-[#334155] tracking-tight">学習統計</h1>
                </div>
                <p className="text-xs md:text-sm text-slate-400 font-bold ml-10 tracking-tight">
                    記憶の安定度と、知識ネットワークの成長を可視化します。
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 md:mt-0">
                <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-white border-slate-100 rounded-2xl shadow-sm text-slate-400 font-bold px-4 text-[10px] md:text-xs hover:border-slate-200 transition-all focus:ring-0 focus:ring-offset-0 focus:outline-none">
                        <SelectValue placeholder="全てのフォルダ" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl bg-white">
                        <SelectItem value="all" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-slate-700">全てのフォルダ</span>
                            </div>
                        </SelectItem>
                        {(() => {
                             // Sort folders hierarchically
                             const buildHierarchy = (parentId = null, depth = 0) => {
                                 const children = folders
                                     .filter(f => (f.parentFolderId === parentId || (parentId === null && !f.parentFolderId && !f.parent_folder_id)))
                                     .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds); // optional sort
                                 
                                 let result = [];
                                 children.forEach(child => {
                                     result.push({ ...child, depth });
                                     result = [...result, ...buildHierarchy(child.id, depth + 1)];
                                 });
                                 return result;
                             };
                             const sortedFolders = buildHierarchy();

                             return sortedFolders.map(f => (
                                 <SelectItem key={f.id} value={f.id} className="cursor-pointer">
                                     <div className="flex items-center gap-2" style={{ paddingLeft: `${f.depth * 12}px` }}>
                                         {f.depth > 0 && (
                                             <div className="w-px h-4 bg-slate-200 absolute left-0 top-1/2 -translate-y-1/2" style={{ left: `${(f.depth * 12) + 4}px` }}></div>
                                         )}
                                         <Folder className={cn(
                                             "w-4 h-4", 
                                             f.id === selectedFolderId ? "text-primary-600 fill-primary-600/20" : "text-slate-400"
                                         )} />
                                         <span className={cn(
                                             "truncate",
                                             f.depth === 0 ? "font-bold text-slate-700" : "text-slate-600"
                                         )}>
                                             {f.folderName}
                                         </span>
                                     </div>
                                 </SelectItem>
                             ));
                        })()}
                    </SelectContent>
                </Select>

                <Button 
                    variant="outline"
                    onClick={() => setIsAlgoPanelOpen(!isAlgoPanelOpen)}
                    className={cn(
                        "h-10 rounded-2xl px-5 font-bold flex items-center gap-2 transition-all duration-300 text-[10px] md:text-xs",
                        isAlgoPanelOpen ? "bg-primary-600 text-white border-none" : "bg-white text-slate-400 border-slate-100 shadow-sm hover:border-slate-200"
                    )}
                >
                    <Calculator className="w-3.5 h-3.5 opacity-60" />
                    計算ロジック
                </Button>
            </div>
        </div>

        {/* Algorithm Panel */}
        <AlgorithmPanel isOpen={isAlgoPanelOpen} onClose={() => setIsAlgoPanelOpen(false)} />

        {/* Charts Grid - Row 2 */}
        {/* Charts Grid - Row 2 */}
        <div className="mb-8 relative">
            {/* Memory Stability Distribution */}
            <div className="relative">
                <StabilityDistributionChart 
                    data={filteredCards.length === 0 ? DUMMY_BUCKETS : undefined} // undefined means calculate from cards
                    cards={filteredCards} 

                    barOpacity={filteredCards.length === 0 ? 0.3 : 1}
                    enableTooltip={filteredCards.length > 0}
                    showReferenceLines={filteredCards.length > 0}
                />
                
                {/* Empty State Overlay */}
                {filteredCards.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-10 p-4 pb-12">
                        <h3 className="text-sm md:text-base font-bold text-slate-600 mb-3 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-slate-100/50">
                            {EMPTY_STATE_TEXT.title}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed bg-white/60 backdrop-blur-sm p-3 rounded-xl mb-2">
                           {EMPTY_STATE_TEXT.description.split('\n').map((line, i) => (
                               <React.Fragment key={i}>{line}<br/></React.Fragment>
                           ))}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-tight">
                            {EMPTY_STATE_TEXT.note}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Bottom Grid - Row 3 */}

      </div>
    </div>
  );
}
