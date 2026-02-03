import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStabilityPhase } from '@/utils/reviewUtils';

// Stability samples in 0-1 range
const STABILITY_SAMPLES = [0.20, 0.35, 0.55, 0.72, 0.90];

// Correct formula: D = 1 + 100 × S^2.5
const calculateBaseIntervalDays = (stability: number): number => {
  const base = 1 + 100 * Math.pow(stability, 2.5);
  return Math.max(1, Math.min(90, Math.round(base)));
};

export default function ForgettingCurve() {
  const data = STABILITY_SAMPLES.map((stability) => {
    const phase = getStabilityPhase(stability);
    const interval = calculateBaseIntervalDays(stability);
    return {
      phase: phase.shortLabel,
      days: interval,
      stability,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">復習タイミングの目安</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            反射的な主観評価と直近の復習状況から、次の復習タイミングを柔らかく調整します。
            数字は固定ルールではなく、安定度フェーズの目安として表示されます。
          </p>
          
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="phase" 
                label={{ value: '安定度フェーズ', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                yAxisId="left"
                label={{ value: '復習間隔（目安・日）', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="days" 
                stroke="#6366f1" 
                strokeWidth={2}
                name="復習間隔（目安）"
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.map((row) => (
              <div key={row.phase} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{row.phase}:</span>
                <span className="text-gray-600">{row.days}日後（目安）</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}