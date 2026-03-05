import React from 'react';
import { Globe } from '@/ui/icons';
import { Card, CardContent } from '@/components/ui/card';

export default function Gallery() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">ギャラリー</h1>
          <p className="text-slate-500 text-sm">画像付きカードを一覧で視覚的に確認できます</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100/50">
          <Globe className="w-6 h-6" />
        </div>
      </div>

      <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 shadow-none rounded-[32px] overflow-hidden group hover:border-primary-200 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 mb-6 group-hover:scale-110 group-hover:text-primary-300 transition-all duration-500">
            <Globe className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">準備中です</h2>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
            現在この機能は開発中です。ここでは、学習中の画像データを一元管理し、視覚的なインスピレーションを得られるような体験を提供予定です。
          </p>
        </CardContent>
      </Card>
      
      {/* 将来的にここにグリッドを表示する予定 */}
      <div className="mt-12 opacity-20 pointer-events-none select-none">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-200 rounded-3xl animate-pulse"></div>
              ))}
          </div>
      </div>
    </div>
  );
}
