import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/Components/ui/table';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SUBJECTIVE_EMOJIS, SUBJECTIVE_LABELS, getStabilityPhase, mapLegacyLevelToStability, normalizeMemoryStability } from '@/utils/reviewUtils';

const REASON_LABELS = {
  correct: '正解',
  incorrect: '不正解',
  manual: '手動変更',
  subjective: '主観評価'
};

const normalizeHistoryStability = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number') return null;
  if (value <= 6) {
    return mapLegacyLevelToStability(value);
  }
  return normalizeMemoryStability(value, null);
};

export default function LevelHistoryTable({ histories, cards }) {
  const getCardInfo = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return { qNumber: '?', title: '' };
    const index = cards.findIndex(c => c.id === cardId);
    return { 
      qNumber: `Q${index + 1}`, 
      title: card.title || '' 
    };
  };
  
  if (histories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">安定度の変化履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">履歴がありません</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">安定度の変化履歴</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>カード</TableHead>
                <TableHead>変更</TableHead>
                <TableHead>理由</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {histories.slice(0, 50).map((history) => {
                const { qNumber, title } = getCardInfo(history.cardId || history.card_id);
                const fromValue = history.fromStability ?? history.from_stability ?? history.from_level;
                const toValue = history.toStability ?? history.to_stability ?? history.to_level;
                const fromStability = normalizeHistoryStability(fromValue);
                const toStability = normalizeHistoryStability(toValue);
                const fromPhase = fromStability !== null ? getStabilityPhase(fromStability) : null;
                const toPhase = toStability !== null ? getStabilityPhase(toStability) : null;
                const stabilityDelta = (toStability ?? 0) - (fromStability ?? 0);
                const subjectiveScore = history.subjectiveScore ?? history.subjective_score;
                
                return (
                  <TableRow key={history.id}>
                    <TableCell className="text-sm text-gray-600">
                      {history.changed_at ? format(new Date(history.changed_at), 'M/d HH:mm', { locale: ja }) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-indigo-600">{qNumber}</span>
                        {title && <span className="text-sm text-gray-500 truncate max-w-[100px]">{title}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {fromPhase ? (
                          <Badge className={fromPhase.colorClass}>
                            {fromPhase.shortLabel}
                          </Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                        {stabilityDelta > 0 ? (
                          <ArrowUp className="w-4 h-4 text-green-500" />
                        ) : stabilityDelta < 0 ? (
                          <ArrowDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                        {toPhase ? (
                          <Badge className={toPhase.colorClass}>
                            {toPhase.shortLabel}
                          </Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        history.reason === 'correct' ? 'text-green-600' :
                        history.reason === 'incorrect' ? 'text-red-600' :
                        history.reason === 'subjective' ? 'text-indigo-600' :
                        'text-gray-600'
                      }>
                        {history.reason === 'subjective' && typeof subjectiveScore === 'number'
                          ? `主観: ${SUBJECTIVE_EMOJIS[subjectiveScore]} ${SUBJECTIVE_LABELS[subjectiveScore]}`
                          : (REASON_LABELS[history.reason] || history.reason)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}