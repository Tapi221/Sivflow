import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/services/localDB';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestoreDb } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/Components/ui/skeleton';
import {
  Flame,
  HelpCircle,
  Bookmark,
  Clock,
  FileText,
  Sparkles,
  ChevronRight,
  CheckCheck,
  Download,
  Upload,
  Brain,
  Zap
} from 'lucide-react';
import { createPageUrl } from '@/utils';

import ExportDialog from '@/Components/export/ExportDialog';
import ImportDialog from '@/Components/export/ImportDialog';
import { useUserSettings } from '@/hooks/useUserSettings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/Components/ui/tooltip";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();
  
  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Study logs for streak calculation
  const { data: studyLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['studyLogs', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return [];
      const q = query(
        collection(firestoreDb, 'studyLogs'),
        where('userId', '==', currentUser.uid),
        orderBy('studiedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).slice(0, 100);
    }, 
    enabled: !!currentUser,
  });

  // Local Study logs (Rescued/Offline)
  const localStudyLogs = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      return await localDb.table('studyLogs').toArray();
    },
    [currentUser, localDb.name]
  );
  
  // Filter out deleted cards and hidden folders
  const validFolderIds = new Set(folders.map(f => f.id || f.folderId));
  const hiddenFolderIds = new Set(folders.filter(f => f.isHidden || f.is_hidden).map(f => f.id || f.folderId));
  
  const activeCards = cards.filter(card => {
    if (card.isDeleted || card.is_deleted) return false;
    if (foldersLoading) return true;
    const cardFolderId = card.folderId || card.folder_id;
    if (cardFolderId && !validFolderIds.has(cardFolderId)) return false;
    if (cardFolderId && hiddenFolderIds.has(cardFolderId)) return false;
    return true;
  });
  
  // Filtered lists for dashboard
  const todayCards = activeCards.filter(card => {
    if (card.isDraft || card.is_draft) return false;
    if (!card.nextReviewDate && !card.next_review_date) return false;
    
    let reviewDate = card.nextReviewDate || card.next_review_date;
    if (typeof reviewDate?.toDate === 'function') {
      reviewDate = reviewDate.toDate();
    } else if (!(reviewDate instanceof Date)) {
      reviewDate = new Date(reviewDate);
    }
    
    if (isNaN(reviewDate.getTime())) return false;





    const today = new Date();
    // Reset time components for accurate date comparison
    const rDate = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const autoCarryOver = settings?.autoCarryOver ?? true;

    if (autoCarryOver) {
        // Include past due dates
        return rDate <= tDate;
    } else {
        // Only strictly today
        return rDate.getTime() === tDate.getTime();
    }
  });

  // Streak calculation
  const streak = useMemo(() => {
    // Combine logs (unique by folderId+cardId+studiedAt string)
    const combinedLogs = [...studyLogs];
    if (localStudyLogs) {
        // Simple merge
        combinedLogs.push(...localStudyLogs);
    }

    if (combinedLogs.length === 0) return 0;

    const dates = new Set(combinedLogs.map(log => {
      const dateVal = log.studiedAt?.toDate?.() || new Date(log.studiedAt);
      return dateVal.toDateString();
    }));
    
    // Check if we studied today
    const today = new Date();
    const studiedToday = dates.has(today.toDateString());
    
    let count = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        if (dates.has(d.toDateString())) {
            count++;
        } else if (i === 0) {
            continue;
        } else {
            break;
        }
    }
    
    // User Request: Count today if ANY review is done (studiedToday is true)
    // if (studiedToday && todayCards.length > 0) { ... } <- Removed constraint
    
    return count;
    // @ts-ignore
  }, [studyLogs, localStudyLogs, todayCards.length]);

  const uncertainCards = activeCards.filter(c => 
    (c.hasUncertainty || c.has_uncertainty) && !c.isDraft && !c.is_draft
  );
  
  const focusCards = activeCards.filter(c => 
    !c.isDraft && !c.is_draft && 
    (c.isSilent === false || (c.tags && c.tags.includes('focus')))
  );
  
  const bookmarkedCards = activeCards.filter(c => 
    (!c.isDraft && !c.is_draft) && (c.isBookmarked || c.is_bookmarked)
  );
  
  const draftCards = cards.filter(c => 
    (c.isDraft || c.is_draft) && 
    !(c.isDeleted || c.is_deleted)
  );

  const lastStudiedFolder = useMemo(() => {
    if (studyLogs.length === 0) return null;
    const lastLog = studyLogs[0];
    const cardId = lastLog.cardId || lastLog.card_id;
    const card = cards.find(c => c.id === cardId);
    if (!card) return null;
    const fId = card.folderId || card.folder_id;
    return folders.find(f => f.id === fId || f.folderId === fId);
  }, [studyLogs, cards, folders]);
  
  const isLoading = cardsLoading || foldersLoading || logsLoading;

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="max-w-[1100px] mx-auto p-4 md:p-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
           <div className="flex-1">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary-600 shadow-sm shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-700 leading-tight">
                  こんにちは、{settings?.displayName || '学習者'}さん
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-400 font-medium ml-1">今日も着実に知識を積み上げましょう。</p>
           </div>
           
           {/* Desktop Streak Display (Hidden on Mobile) */}
           <div className="hidden md:flex items-center gap-4 bg-white px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm transition-all hover:shadow-md h-fit">
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center cursor-default">
                       <div className="text-[8px] md:text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-0.5 md:mb-1">Streak</div>
                       <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-400 fill-orange-400" />
                          <span className="text-lg md:text-xl font-bold text-slate-700">{streak}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1">days</span>
                       </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white text-slate-600 border border-slate-100 shadow-2xl font-bold py-3 px-4 rounded-xl">
                    <p className="text-xs">1枚でも復習するとストリークが増えます</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </div>
        </div>

        {/* Mobile Streak Display (Positioned below settings icon) */}
        <div className="md:hidden flex justify-end mb-8 -mt-10 relative z-10 pr-0">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12)] flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
               <div className="flex flex-col items-end">
                 <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">STREAK</span>
                 <div className="flex items-center gap-1.5">
                   <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                   <span className="text-sm font-bold text-slate-700 leading-none">{streak}</span>
                   <span className="text-[9px] font-bold text-slate-400 mt-0.5">days</span>
                 </div>
               </div>
            </div>
        </div>

        {/* Priority Section (Today's Review) */}
        <section className="mb-8 md:mb-12">
            <div 
              className="bg-white rounded-3xl md:rounded-[40px] py-4 px-5 md:p-10 border border-slate-50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-lg transition-all group overflow-hidden relative"
              onClick={() => navigate(createPageUrl('study'))}
            >
                <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-primary-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
                    <div className="space-y-1 md:space-y-4">
                        <div className="hidden md:flex items-center gap-2">
                           <div className="px-2 md:px-3 py-0.5 md:py-1 bg-primary-50 text-primary-600 text-[9px] md:text-[10px] font-bold rounded-full uppercase tracking-wider">Priority Task</div>
                           {todayCards.length > 0 && <div className="animate-pulse w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-primary-600"></div>}
                        </div>
                        <h2 className="text-xl md:text-4xl font-bold text-slate-800">今日の復習</h2>
                        <p className="text-[10px] md:text-sm text-slate-400 font-medium max-w-sm mt-0 md:mt-2">
                           記憶が薄れる最適なタイミングです。{todayCards.length}枚が待機中。
                           <span className="hidden md:block text-[10px] text-slate-300 mt-2 font-bold">※非表示フォルダは除外されています</span>
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex flex-col items-center">
                           <span className="text-3xl md:text-6xl font-bold text-primary-600 italic leading-none">{todayCards.length}</span>
                           <span className="text-[9px] md:text-[10px] font-bold text-slate-300 uppercase mt-1 md:mt-2 tracking-widest">Cards Remaining</span>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                           <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* WEAK POINTS & FOCUS AREA */}
        {/* WEAK POINTS & FOCUS AREA */}
        {/* WEAK POINTS & FOCUS AREA */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 mb-12">
            {/* Weak Points */}
            <div>
               <div 
                 className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-50 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden h-[160px] md:h-[200px] flex flex-col justify-between"
                 onClick={() => navigate(createPageUrl('uncertain'))}
               >
                   <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 text-slate-100 group-hover:text-amber-50 group-hover:scale-110 transition-all duration-500">
                      <HelpCircle className="w-28 h-28 md:w-48 md:h-48 opacity-50" />
                   </div>

                   <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                      <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   
                   <div className="relative z-10">
                      <div className="flex items-baseline gap-1 md:gap-2 mb-0.5 md:mb-1">
                         <span className="text-2xl md:text-3xl font-bold text-slate-700">{uncertainCards.length}</span>
                         <span className="text-[10px] md:text-xs font-bold text-slate-400">枚</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-bold leading-tight">確認が必要な<br className="md:hidden"/>カード</p>
                   </div>
               </div>
            </div>

            {/* Focus Area */}
            <div>
               <div 
                 className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-50 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden h-[160px] md:h-[200px] flex flex-col justify-between"
                 onClick={() => navigate(createPageUrl('bookmark'))} 
               >
                   <div className="absolute -bottom-6 -right-6 md:-bottom-10 md:-right-10 text-slate-100 group-hover:text-teal-50 group-hover:scale-110 transition-all duration-500">
                      <Bookmark className="w-28 h-28 md:w-48 md:h-48 opacity-50" />
                   </div>

                   <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                      <Bookmark className="w-5 h-5 md:w-6 md:h-6" />
                   </div>
                   
                   <div className="relative z-10">
                       <div className="flex items-baseline gap-1 md:gap-2 mb-0.5 md:mb-1">
                         <span className="text-2xl md:text-3xl font-bold text-slate-700">{bookmarkedCards.length}</span>
                         <span className="text-[10px] md:text-xs font-bold text-slate-400">枚</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-bold leading-tight">ブックマーク<br className="md:hidden"/>したカード</p>
                   </div>
               </div>
            </div>
        </div>
        
        {/* RESUME Section */}
        {isLoading ? (
            <Skeleton className="h-20 w-full rounded-3xl mb-6" />
        ) : lastStudiedFolder && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5 text-primary-600" />
              <h2 className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">
                Resume Learning
              </h2>
            </div>
            <div 
              className="bg-white rounded-3xl p-5 cursor-pointer hover:shadow-md transition-all shadow-sm border border-slate-50 group"
              onClick={() => navigate(createPageUrl(`FolderView?id=${lastStudiedFolder.id || lastStudiedFolder.folderId}`))}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary-600 transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-slate-300 font-bold mb-0.5 uppercase tracking-wider">前回の続き</p>
                  <p className="text-base font-bold text-slate-700 truncate">{lastStudiedFolder.folderName || lastStudiedFolder.folder_name}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-primary-600 transition-colors" />
              </div>
            </div>
          </section>
        )}
        
        {/* DRAFTS Section */}
        {isLoading ? (
             <Skeleton className="h-32 w-full rounded-3xl" />
        ) : draftCards.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-3.5 h-3.5 text-primary-600" />
              <h2 className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">
                Drafts in Progress
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {draftCards.slice(0, 10).map(card => {
                const folder = folders.find(f => f.id === card.folderId || f.id === card.folder_id);
                const folderName = folder?.folderName || folder?.folder_name || '無所属';
                const title = card.title || '無題のカード';
                
                return (
                  <div 
                    key={card.id}
                    className="flex-shrink-0 w-[180px] bg-white rounded-3xl p-5 cursor-pointer hover:shadow-md transition-all shadow-sm border border-slate-50 group"
                    onClick={() => navigate(createPageUrl(`CardEdit?id=${card.id}`))}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-primary-600 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[8px] font-bold text-slate-200 uppercase tracking-widest">
                        Draft
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1 truncate">{title}</h3>
                    <p className="text-[10px] text-slate-300 font-medium truncate">{folderName}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
      
      {/* Dialogs */}
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <ImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
