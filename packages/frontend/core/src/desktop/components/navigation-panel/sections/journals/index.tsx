import React, { useState, useCallback } from 'react';
import { useI18n } from '@affine/i18n';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelTreeNode } from '../../tree';

interface CalendarItem {
  id: string;
  name: string;
  color: string;
  checked: boolean;
}

// 提供された画像に基づいたカレンダーの初期データ
const initialItems: CalendarItem[] = [
  { id: '1', name: 'Programming', color: '#00E676', checked: true },
  { id: '2', name: 'Test', color: '#FF1744', checked: true },
  { id: '3', name: 'English', color: '#2979FF', checked: true },
  { id: '4', name: 'Enjoyment', color: '#FFC400', checked: true },
  { id: '5', name: 'Math', color: '#00E5FF', checked: true },
  { id: '6', name: 'Manifolia', color: '#4CAF50', checked: true },
  { id: '7', name: 'Sleep', color: '#E0E0E0', checked: false },
  { id: '8', name: 'ごみ', color: '#B388FF', checked: true },
  { id: '9', name: 'Chemistry', color: '#E0E0E0', checked: false },
  { id: '10', name: 'GQueues', color: '#00E676', checked: true },
  { id: '11', name: 'Part-time job', color: '#212121', checked: true },
  { id: '12', name: 'Prog', color: '#F50057', checked: true },
  { id: '13', name: 'アクチュアリー', color: '#2979FF', checked: true },
  { id: '14', name: '課題', color: '#00E676', checked: true },
  { id: '15', name: '授業', color: '#00E676', checked: true },
];

const CircleCheckIcon = ({ color, checked, className }: { color: string; checked: boolean; className?: string }) => {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
      {checked ? (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill={color} />
          <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" stroke="#ccc" strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
  );
};

export const NavigationPanelJournals = () => {
  const [items, setItems] = useState<CalendarItem[]>(initialItems);
  const t = useI18n();

  const handleToggle = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }, []);

  const setCollapsedDummy = useCallback(() => {}, []);

  return (
    <CollapsibleSection
      path={['journals']}
      title={t['com.affine.journal.app-sidebar-title']?.() || 'Journals'}
      collapsible={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(item => {
          const Icon = ({ className }: { className?: string }) => (
            <CircleCheckIcon color={item.color} checked={item.checked} className={className} />
          );

          return (
            <NavigationPanelTreeNode
              key={item.id}
              icon={Icon}
              name={item.name}
              collapsible={false}
              collapsed={true}
              setCollapsed={setCollapsedDummy}
              reorderable={false}
              onClick={() => handleToggle(item.id)}
            />
          );
        })}
      </div>
    </CollapsibleSection>
  );
};
