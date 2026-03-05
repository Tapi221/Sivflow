import React, { 
  useState, 
  useMemo, 
  useEffect 
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/hooks/useCards';
import { useFolders } from '@/hooks/useFolders';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft,
  ChevronRight,
} from '@/ui/icons';
import { createPageUrl } from '@/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';

import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { getResistancePhase } from '@/utils/reviewUtils';

// ---------------------------------------------------------------------------
// RESISTANCE LEGEND (Static Definition for Maturity/Resistance)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// RESISTANCE LEGEND (Matched to Statistics/ReviewUtils Phases)
// ---------------------------------------------------------------------------
const RESISTANCE_LEGEND = [
  { label: "要復習 (Unstable)", min: 0, max: 20, color: "bg-red-400" },
  { label: "覚えかけ (Fragile)", min: 20, max: 40, color: "bg-orange-400" },
  { label: "定着途上 (Growing)", min: 40, max: 65, color: "bg-yellow-400" },
  { label: "安定 (Stable)", min: 65, max: 85, color: "bg-green-400" },
  { label: "長期保持 (Solid)", min: 85, max: 100, color: "bg-emerald-400" },
];

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    const seconds =
      typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null;
    const nanoseconds =
      typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value._nanoseconds === 'number'
          ? value._nanoseconds
          : 0;
    if (seconds !== null) {
      const d = new Date(seconds * 1000 + Math.floor(nanoseconds / 1e6));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const getCalendarCardTitle = (card) => {
  const rawTitle = card?.title;
  if (typeof rawTitle === 'string' && rawTitle.trim().length > 0) {
    return rawTitle.trim();
  }

  const questionText = String(card?.questionText ?? card?.question_text ?? '');
  const textOnly = questionText.replace(/<[^>]*>/g, '').trim();
  if (textOnly.length > 0) {
    return textOnly.length > 50 ? `${textOnly.substring(0, 50)}...` : textOnly;
  }

  return '無題のカード';
};

export default function Calendar() {
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedFolderId, setExpandedFolderId] = useState(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const map = {
        'ArrowLeft': -1,
        'ArrowRight': 1,
        'ArrowUp': -7,
        'ArrowDown': 7,
      };

      if (map[e.key]) {
        e.preventDefault();
        const diff = map[e.key];
        const newDate = addDays(selectedDate, diff);
        setSelectedDate(newDate);
        
        // Auto-switch month if needed
        if (!isSameMonth(newDate, currentDate)) {
            setCurrentDate(startOfMonth(newDate));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, currentDate]);

  const { cards = [], loading: cardsLoading } = useCards();
  const { folders = [], loading: foldersLoading } = useFolders();
  const { settings } = useUserSettings();

  const folderMap = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const id = folder?.id ?? folder?.folderId;
      if (id) map.set(String(id), folder);
    });
    return map;
  }, [folders]);
  
  // Get cards grouped by date
  const cardsByDate = useMemo(() => {
    const grouped = {};
    cards.filter(c => {
        const isDeleted = Boolean(
          c.isDeleted ??
          c.is_deleted ??
          c.deleted ??
          c.deletedAt ??
          c.deleted_at
        );
        const isDraft = Boolean(c.isDraft ?? c.is_draft);
        const dateVal = c.next_review_date || c.nextReviewDate;
        const isSilent = Boolean(c.is_silent ?? c.isSilent);
        const rawFolderId = c.folderId || c.folder_id;
        const folderId = rawFolderId ? String(rawFolderId) : null;

        // 学習バッジと一致させるため、下書き/サイレント/削除済みは除外する。
        if (isDeleted || isDraft || isSilent || !dateVal) return false;

        // フォルダ一覧のロード完了後は、存在しない folderId を除外する。
        // これにより「不明なフォルダ」グループが予定表に出ないようにする。
        if (!folderId) return true;
        if (foldersLoading) return true;
        const folder = folderMap.get(folderId);
        if (!folder) return false;
        return !(folder.isDeleted ?? folder.is_deleted);
    }).forEach(card => {
      const dateValue = card.next_review_date || card.nextReviewDate;
      const dateObj = toDate(dateValue);

      if (!dateObj || isNaN(dateObj.getTime())) return;

      // Auto Carry Over Logic for Calendar Display
      const autoCarryOver = settings?.autoCarryOver ?? true;
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Reset time for comparison
      const checkDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      let dateKey = format(dateObj, 'yyyy-MM-dd');

      // If overdue and autoCarryOver is used, treat as Today
      if (autoCarryOver && checkDate < todayDate) {
          dateKey = todayStr;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(
        autoCarryOver && checkDate < todayDate
          ? { ...card, is_overdue: true }
          : card
      );
    });
    return grouped;
  }, [cards, folderMap, foldersLoading, settings?.autoCarryOver]);
  
  // Get cards for selected date
  const selectedDateCards = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return cardsByDate[dateStr] || [];
  }, [cardsByDate, selectedDate]);


  // Group cards by folder
  const groupedPlannedUnits = useMemo(() => {
    const counts = {}; 
    selectedDateCards.forEach(card => {
        const fidRaw = card.folderId || card.folder_id;
        const fid = fidRaw ? String(fidRaw) : null;
        const key = fid || 'uncategorized';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    return Object.entries(counts).map(([folderId, count]) => {
        if (folderId === 'uncategorized') {
             return { folderName: '未分類', count, folderId: 'uncategorized' };
        }
        const folder = folderMap.get(String(folderId));
        return {
            folderName: folder?.folderName || folder?.folder_name || '不明なフォルダ',
            count,
            folderId
        };
    }).sort((a, b) => b.count - a.count);
  }, [selectedDateCards, folderMap]);

  const renderCalendarGrid = () => {
    const weekStartDay = settings?.weekStartDay === 'sunday' ? 0 : 1; // 0=Sun, 1=Mon
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartDay });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartDay });
    
    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
      calendarDays.push(day);
      day = addDays(day, 1);
    }

    const weekDays = weekStartDay === 0 
        ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    return (
        <div className="w-full">
            {/* Days Header */}
            <div className="grid grid-cols-7 mb-4">
                {weekDays.map((d, i) => (
                    <div key={d} className={cn(
                        "text-center text-[10px] font-bold tracking-[0.2em] text-slate-300",
                        d === 'SUN' && "text-[#FF5A65]", // Sun
                        d === 'SAT' && "text-[#00A3FF]"  // Sat
                    )}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-y-2 md:gap-y-4 gap-x-0">
                {calendarDays.map((dayItem, index) => {
                    const dateStr = format(dayItem, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(dayItem, currentDate);
                    const isSelected = isSameDay(dayItem, selectedDate);
                    const isTodayDate = isToday(dayItem);
                    const dayCards = cardsByDate[dateStr] || [];
                    const hasCards = dayCards.length > 0;
                    
                    // Intensity dots
                    const intensity = Math.min(5, Math.ceil(dayCards.length / 5)); // 1-5 dots

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => setSelectedDate(dayItem)}
                            className={cn(
                                "calendar-day-base cursor-pointer group min-h-[56px] md:min-h-[88px]", // Height increased for 3D bottom border
                                !isCurrentMonth && "opacity-30 grayscale",
                                isSelected 
                                    ? "calendar-day-selected" 
                                    : "calendar-day-flat",
                                isTodayDate && !isSelected && "calendar-day-today"
                            )}
                        >
                            {/* Date Number */}
                            <span className={cn(
                                "text-sm font-bold mb-1 md:mb-1 transition-colors calendar-date-text",
                                isSelected ? "text-primary-700" : "text-slate-400 group-hover:text-slate-600",
                                isTodayDate && !isSelected && "text-primary-700"
                            )}>
                                {format(dayItem, 'd')}
                            </span>

                            {/* Intensity Visual (Dots or Bar) */}
                            {hasCards ? (
                                <div className="flex flex-col items-center mt-0 gap-1 w-full">
                                    <span className={cn(
                                        "text-lg md:text-xl font-black leading-none tracking-tight",
                                        dayCards.some(c => c.is_overdue) ? "text-[#FF5A65]" : "text-primary-600"
                                    )}>
                                        {dayCards.length}
                                    </span>
                                    <div className="hidden md:flex gap-1 justify-center w-full px-2">
                                        {Array.from({ length: intensity }).map((_, i) => (
                                            <div key={i} className={cn(
                                                "w-1.5 h-1.5 rounded-full calendar-dot-3d",
                                                dayCards.some(c => c.is_overdue) ? "bg-[#FF5A65]" : "bg-primary-400"
                                            )} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Empty State Check (Today) */
                                isTodayDate && (
                                    <div className="mt-2 text-[9px] font-bold text-primary-300">TODAY</div>
                                )
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 p-4 md:p-8 flex flex-col">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-start mb-2 md:mb-6 w-full max-w-[1400px] mx-auto gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                        const now = new Date();
                        setCurrentDate(now);
                        setSelectedDate(now);
                    }}
                    className="h-10 rounded-full border border-[var(--surface-border)] text-slate-500 font-bold px-4 hover:border-primary-600 hover:text-primary-600 bg-white face-badge-convex"
                >
                    Today
                </Button>

                <div className="flex items-center bg-white rounded-full p-1 border border-[var(--surface-border)] face-badge-convex h-10 w-full sm:w-auto justify-between">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="h-8 w-8 rounded-full text-slate-400 hover:text-primary-600 bg-white border border-[var(--surface-border)] face-badge-convex hover:bg-white shrink-0">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="flex-1 sm:w-32 text-center text-[11px] sm:text-xs font-extrabold text-[#334155] tracking-wider uppercase">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-8 w-8 rounded-full text-slate-400 hover:text-primary-600 bg-white border border-[var(--surface-border)] face-badge-convex hover:bg-white shrink-0">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>

        {/* Main Content Split View */}
        <div className="flex-1 max-w-[1400px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start mb-20 md:mb-0">
            
            {/* Left: Calendar Grid */}
            <Card className="rounded-[32px] md:rounded-[40px] border-none shadow-sm bg-white p-4 md:p-10 h-fit md:min-h-[600px]">
                {renderCalendarGrid()}
            </Card>

            {/* Right: Sidebar */}
            <Card className="rounded-[32px] md:rounded-[40px] border border-[#d7d9de] surface-panel-convex bg-white p-6 md:p-8 min-h-[400px] md:min-h-[600px] flex flex-col relative md:sticky md:top-8">
                {/* Header */}
                <div className="mb-6 md:mb-10">
                    <p className="text-[10px] font-bold text-primary-600 tracking-[0.2em] uppercase mb-2">Focus Detail</p>
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl md:text-4xl font-black text-[#334155] tracking-tight">
                            {format(selectedDate, 'MMM d')}
                        </h2>
                    </div>
                </div>

                {/* Planned Units List */}
                <div className="flex-1 overflow-y-auto pr-2 mb-8 -mr-2">
                     <div className="space-y-3">
                        {selectedDateCards.length === 0 ? (
                            <div className="text-center py-10 text-slate-300 text-xs font-bold">
                                No reviews scheduled
                            </div>
                        ) : (
                            groupedPlannedUnits.map(group => {
                                const isExpanded = expandedFolderId === group.folderId;
                                const groupCards = selectedDateCards.filter(c => {
                                    const fid = c.folderId || c.folder_id;
                                    return (fid || 'uncategorized') === group.folderId;
                                });

                                return (
                                    <div key={group.folderId} className="transition-all duration-300">
                                        {/* Folder Header */}
                                        <div 
                                            className={cn(
                                                "p-4 rounded-2xl bg-[#F8FAFB] flex items-center justify-between group border border-transparent hover:border-slate-100 transition-all cursor-pointer",
                                                isExpanded && "bg-slate-50 border-slate-100 rounded-b-none"
                                            )}
                                            onClick={() => setExpandedFolderId(isExpanded ? null : group.folderId)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary-600 shadow-sm">
                                                    <FolderIcon />
                                                </div>
                                                <div className="font-bold text-slate-700 text-sm">{group.folderName}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-white hover:bg-white text-slate-500 border border-slate-100 shadow-sm">
                                                    {group.count}
                                                </Badge>
                                                <div className={cn("text-slate-300 transition-transform duration-300", isExpanded && "rotate-180")}>
                                                    <ChevronDownIcon />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Cards List */}
                                        {isExpanded && (
                                            <div className="bg-white border-x border-b border-slate-100 rounded-b-2xl p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                                {groupCards.map(card => {
                                                    // --- KEY CHANGE: Use Resistance Score instead of Stability ---
                                                    const interval = card.interval || 0;
                                                    const resistance = calculateResistanceScore(interval);
                                                    
                                                    // Color Logic based on Resistance Phase
                                                    const phase = getResistancePhase(resistance);
                                                    const dotColor = phase.calendarClass;

                                                    return (
                                                        <div 
                                                            key={card.id} 
                                                            className="p-3 rounded-xl hover:bg-slate-50 flex items-start justify-between cursor-pointer group/card transition-colors"
                                                            onClick={() => {
                                                                const cardFolderId = card.folderId || card.folder_id;
                                                                const query = cardFolderId
                                                                  ? `CardEdit?id=${card.id}&folderId=${cardFolderId}&returnTo=calendar`
                                                                  : `CardEdit?id=${card.id}&returnTo=calendar`;
                                                                navigate(createPageUrl(query));
                                                            }}
                                                        >
                                                            <div className="text-xs font-bold text-slate-600 line-clamp-1 group-hover/card:text-primary-600 transition-colors">
                                                                {getCalendarCardTitle(card)}
                                                            </div>
                                                            <div className={cn(
                                                                "w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0",
                                                                dotColor
                                                            )} />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                     </div>
                </div>

                {/* Start Button */}
                <Button 
                    className="w-full h-14 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm tracking-widest shadow-lg shadow-primary-600/20 transition-all active:scale-[0.98]"
                    onClick={() => {
                        if (isToday(selectedDate)) {
                            navigate(createPageUrl('StudyMode'));
                        } else {
                            // If user clicks start on a future date, maybe go to study that specific day?
                            // For now, let's just go to StudyMode (Today) as it is strict logic.
                            navigate(createPageUrl('StudyMode'));
                        }
                    }}
                    disabled={selectedDateCards.length === 0 || !isToday(selectedDate)}
                >
                    START LEARNING
                </Button>

            </Card>
        </div>
        
        {/* Footer Legend (Static Resistance Legend) */}
        <div className="max-w-[1400px] mx-auto w-full mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 md:pl-10 pb-4">
            {/* Standard Calendar Indicators */}
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#FF5A65]" />
                OVERDUE
            </div>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-600" />
                INTENSITY
            </div>
            
            {/* Separator */}
            <div className="w-px h-3 bg-slate-300 mx-2"></div>
            
            {/* Resistance Legend */}
            {RESISTANCE_LEGEND.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    {item.label}
                </div>
            ))}
        </div>
    </div>
  );
}

const FolderIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
);

const ChevronDownIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <path d="M6 9l6 6 6-6" />
    </svg>
);
