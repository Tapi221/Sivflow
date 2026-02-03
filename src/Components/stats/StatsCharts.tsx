import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { normalizeMemoryStability, getStabilityPhase } from '@/utils/reviewUtils';
import { calculateAverageStability, isReviewed } from '@/utils/statistics';
import { calculateResistanceScore } from '@/utils/reviewMetrics';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
// ... (omitted lines)

export function StabilityDistributionChart({ 
    cards, 
    className, 

    data: manualData,
    barOpacity = 1,
    enableTooltip = true,
    showReferenceLines = true
}) {
  // Use utility for calculation
  const avgStability = calculateAverageStability(cards);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const handleResize = () => {
        setIsDesktop(window.innerWidth >= 768);
    };
    
    handleResize(); // Initial check

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate Average Resistance Score
  const averageResistance = useMemo(() => {
    let totalScore = 0;
    let count = 0;
    
    cards.forEach(card => {
        if (!isReviewed(card)) return;
        
        // Same logic as buckets
        let intervalDays = 0;
        const lastReview = card.lastReviewAt ? new Date(card.lastReviewAt).getTime() : 0;
        const nextReview = card.nextReviewDate ? new Date(card.nextReviewDate).getTime() : 0;
        
        if (lastReview > 0 && nextReview > lastReview) {
            const diffMs = nextReview - lastReview;
            intervalDays = diffMs / (1000 * 60 * 60 * 24);
        }
        
        totalScore += calculateResistanceScore(intervalDays);
        count++;
    });
    
    return count > 0 ? Math.round(totalScore / count) : 0;
  }, [cards]);

  const hasData = averageResistance > 0;
  const avgPercent = averageResistance;

  // Calculate buckets only if manualData is not provided
  const buckets = useMemo(() => {
      if (manualData) return manualData;

      // Create 5% buckets: 0-5%, 5-10%, ..., 95-100%
      const newBuckets = Array.from({ length: 20 }, (_, i) => ({
        range: `${i * 5}-${(i + 1) * 5}%`,
        count: 0,
        min: i * 5,
        mid: i * 5 + 2.5,
        max: (i + 1) * 5
      }));
      
      // Count cards in each bucket (Only reviewed cards)
      cards.forEach(card => {
        // Only count reviewed cards for the distribution
        if (!isReviewed(card)) return;

        // Calculate interval based on dates
        // If nextReviewDate or lastReviewAt is missing, fallback to 0 or other logic
        // Try to determine interval from schedule first
        let intervalDays = 0;
        
        const lastReview = card.lastReviewAt ? new Date(card.lastReviewAt).getTime() : 0;
        const nextReview = card.nextReviewDate ? new Date(card.nextReviewDate).getTime() : 0;
        
        if (lastReview > 0 && nextReview > lastReview) {
            const diffMs = nextReview - lastReview;
            intervalDays = diffMs / (1000 * 60 * 60 * 24);
        }

        const resistanceScore = calculateResistanceScore(intervalDays);
        
        const percentage = Math.min(100, Math.max(0, resistanceScore));
        const bucketIndex = Math.min(19, Math.floor(percentage / 5));
        newBuckets[bucketIndex].count++;
      });
      return newBuckets;
  }, [cards, manualData]);
  
  const yDomainMax = Math.max(...buckets.map(b => b.count)) + 1; // Add padding for labels

  return (
    <Card className={cn("rounded-2xl md:rounded-[24px] border-none shadow-sm p-5 md:p-8 bg-white", className)}>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-xs md:text-sm font-bold text-slate-700">耐性スコア分布</h2>
        </div>
      <CardContent className="p-0">
        <style>{`
          .recharts-wrapper, .recharts-surface, .recharts-layer { outline: none !important; }
          *:focus { outline: none !important; }
        `}</style>
        <div className="w-full outline-none focus:outline-none px-4 md:px-5" style={{ position: 'relative', width: '100%', height: 240, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart 
                data={buckets} 
                margin={{ top: 50, right: -10, left: -10, bottom: 0 }} 
                barCategoryGap="1%"
            >
              <XAxis 
                type="number"
                dataKey="mid" 
                hide={true}
                padding={{ left: 0, right: 0 }}
                domain={[0, 100]}
                ticks={Array.from({ length: 21 }, (_, i) => i * 5)}
                interval={0}
                tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                dy={5}
              />
              <YAxis 
                width={0}
                hide={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#cbd5e1', dx: 5, textAnchor: 'start' }}
                domain={[0, yDomainMax]}
                allowDecimals={false}
              />
              {enableTooltip && (
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    isAnimationActive={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.count === 0) return null; // 0枚の場合は非表示
                        return (
                          <div className="bg-primary-600 text-white text-[10px] md:text-xs rounded-full py-1.5 px-3.5 shadow-xl font-bold border border-white/20 animate-in fade-in duration-200">
                            {data.range} : {data.count} 枚
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
              )}
              <defs>
                <linearGradient id="chartBgGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FCA5A5" />
                  <stop offset="18%" stopColor="#FCA5A5" />
                  <stop offset="22%" stopColor="#FDBA74" />
                  <stop offset="38%" stopColor="#FDBA74" />
                  <stop offset="42%" stopColor="#FDE047" />
                  <stop offset="63%" stopColor="#FDE047" />
                  <stop offset="67%" stopColor="#99F6E4" />
                  <stop offset="83%" stopColor="#99F6E4" />
                  <stop offset="87%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              {/* Unified Phase Background Area with Gradient */}
              <ReferenceArea x1={0} x2={100} fill="url(#chartBgGradient)" fillOpacity={0.15} />
              


              <Bar 
                dataKey="count" 
                radius={[4, 4, 4, 4]}
                activeBar={false}
                animationDuration={1000}
                isAnimationActive={true}
                fillOpacity={barOpacity}
                label={{ 
                    position: 'top', 
                    fontSize: 9, 
                    fontWeight: 'bold', 
                    fill: '#64748b',
                    offset: 3,
                    formatter: (value: any) => value > 0 ? value : ''
                }}
              >
                {buckets.map((entry, index) => {
                  // Color based on phase ranges (matching the bottom legend)
                  // 0-20: Red (#FCA5A5)
                  // 20-40: Orange (#FDBA74)
                  // 40-65: Yellow (#FDE047)
                  // 65-85: Teal (#99F6E4)
                  // 85-100: Green (#16a34a)
                  const min = entry.min;
                  let color = '#FCA5A5'; // default
                  
                  if (min >= 85) {
                    color = '#16a34a'; 
                  } else if (min >= 65) {
                    color = '#99F6E4'; 
                  } else if (min >= 40) {
                    color = '#FDE047'; 
                  } else if (min >= 20) {
                    color = '#FDBA74'; 
                  }
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color}
                      fillOpacity={barOpacity}
                    />
                  );
                })}
              </Bar>
              
              {/* Reference Line for Average */}
              {showReferenceLines && hasData && (
                <ReferenceLine 
                    x={avgPercent} 
                    stroke="var(--color-primary-600-hex, #689A98)" 
                    strokeDasharray="3 3"
                    className="z-10"
                    label={({ viewBox }) => {
                        const xPos = viewBox.x; 
                        
                        return (
                           <foreignObject x={xPos - 75} y={0} width={150} height={30} style={{ overflow: 'visible' }}>
                               <div className="flex justify-center">
                                    <div className="bg-primary-600 text-white text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full text-center shadow-sm whitespace-nowrap z-50">
                                        平均耐性スコア: {avgPercent}%
                                    </div>
                               </div>
                           </foreignObject>
                        );
                    }}
                />
              )}


            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Phase Visualization Bar */}
        <div className="mt-0 px-4 md:px-5">
            <div 
                className="flex w-full text-[8px] md:text-[9px] font-bold text-white text-center rounded-lg overflow-hidden relative filter drop-shadow-sm h-5 md:h-5"
                style={{
                    background: 'linear-gradient(90deg, #FCA5A5 0%, #FCA5A5 18%, #FDBA74 22%, #FDBA74 38%, #FDE047 42%, #FDE047 63%, #99F6E4 67%, #99F6E4 83%, #16a34a 87%, #16a34a 100%)'
                }}
            >
                {[
                    { width: '20%', label: '要復習', textColor: 'text-slate-700' },
                    { width: '20%', label: '覚えかけ', textColor: 'text-slate-700' },
                    { width: '25%', label: '定着途上', textColor: 'text-slate-700' },
                    { width: '20%', label: '安定', textColor: 'text-teal-900' },
                    { width: '15%', label: '長期保持', textColor: 'text-white' },
                ].map((phase) => (
                    <div 
                        key={phase.label}
                        style={{ width: phase.width }} 
                        className={`flex items-center justify-center relative transition-all hover:brightness-110 ${phase.textColor}`}
                    >
                        <span className="drop-shadow-sm whitespace-nowrap">{phase.label}</span>
                    </div>
                ))}
            </div>
             <div className="relative w-full h-4 mt-1">
                {Array.from({ length: 21 }, (_, i) => {
                    const val = i * 5;
                    const interval = isDesktop ? 5 : 10;
                    if (val % interval !== 0) return null;
                    return (
                        <span 
                            key={val}
                            className="absolute text-[9px] text-slate-400 font-mono -translate-x-1/2"
                            style={{ left: `${val}%` }}
                        >
                            {val}%
                        </span>
                    );
                })}
            </div>
        </div>

      </CardContent>
    </Card>
  );
}

export function LevelSummary({ cards }) {
  const totalCards = cards.length;
  
  // Use utility for calculation
  const avgStability = calculateAverageStability(cards);
  
  // Choose phase label based on result
  // If null -> Unmeasured
  // If number -> Get phase label
  const avgPhaseLabel = avgStability !== null 
    ? getStabilityPhase(avgStability).shortLabel 
    : '未計測';
  
  const masteredCards = cards.filter(c => {
    const stability = normalizeMemoryStability(
      c.memoryStability ?? c.memory_stability,
      c.currentLevel ?? c.current_level ?? c.level
    );
    return getStabilityPhase(stability).key === 'solid';
  }).length;
  
  const needReviewCards = cards.filter(c => {
    const reviewDate = c.nextReviewDate ?? c.next_review_date;
    if (!reviewDate) return false;
    const normalized = typeof reviewDate?.toDate === 'function' ? reviewDate.toDate() : new Date(reviewDate);
    return normalized <= new Date();
  }).length;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">総カード数</p>
          <p className="text-3xl font-bold text-indigo-600">{totalCards}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">平均フェーズ</p>
          <p className="text-3xl font-bold text-cyan-600">
            {avgPhaseLabel}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">習得済み</p>
          <p className="text-3xl font-bold text-green-600">{masteredCards}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-500">要復習</p>
          <p className="text-3xl font-bold text-red-600">{needReviewCards}</p>
        </CardContent>
      </Card>
    </div>
  );
}