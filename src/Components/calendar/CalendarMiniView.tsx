/**
 * CalendarMiniView - ダッシュボード埋め込み用コンパクトカレンダー
 */
import React, { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/types';

interface CalendarMiniViewProps {
  cards: Card[];
  weekStartDay?: 'monday' | 'sunday';
  accentColor?: string;
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export function CalendarMiniView({ 
  cards, 
  weekStartDay = 'monday',
  accentColor = '#689A98'
}: CalendarMiniViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 日付ごとのカード枚数を算出
  const cardsByDate = useMemo(() => {
    const grouped: Record<string, Card[]> = {};
    cards.forEach(card => {
      const dateVal = card.nextReviewDate || (card as any).next_review_date;
      const dateObj = toDate(dateVal);
      if (!dateObj) return;

      const dateKey = format(dateObj, 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(card);
    });
    return grouped;
  }, [cards]);

  // カレンダーの日付リストを生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartDay === 'sunday' ? 0 : 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartDay === 'sunday' ? 0 : 1 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth, weekStartDay]);

  const weekDays = weekStartDay === 'sunday' 
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const selectedCards = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return cardsByDate[key] || [];
  }, [selectedDate, cardsByDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-300">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayCards = cardsByDate[dateKey] || [];
          const count = dayCards.length;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "h-10 rounded-xl flex flex-col items-center justify-center transition-all relative overflow-hidden",
                !isCurrentMonth && "opacity-20",
                isSelected 
                  ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200" 
                  : "hover:bg-slate-50 text-slate-500",
                isTodayDate && !isSelected && "bg-slate-100 font-bold"
              )}
            >
              <span className="text-[11px] font-medium leading-none mb-1">{format(day, 'd')}</span>
              {count > 0 && (
                <div 
                  className="w-1 h-1 rounded-full" 
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedCards.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">
            {format(selectedDate, 'MMM d')} - {selectedCards.length} Cards
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 no-scrollbar">
            {selectedCards.slice(0, 5).map((card, i) => (
              <div key={i} className="text-[11px] text-slate-600 truncate bg-slate-50/50 rounded-lg px-2 py-1.5 border border-slate-100/50">
                {card.title || '無題のカード'}
              </div>
            ))}
            {selectedCards.length > 5 && (
              <div className="text-[10px] text-slate-400 italic pl-2 pt-1">
                and {selectedCards.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
