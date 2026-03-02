import React, { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { CardEditorPane } from '@/components/folder/CardEditorPane';

const CARD_EDIT_FOLDER_ID_KEY = 'card-edit:folder-id';

export default function CardEdit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const cardId = searchParams.get('id');
  const folderId = searchParams.get('folderId');
  const returnTo = searchParams.get('returnTo');
  const shouldReturnToCalendar = returnTo === 'calendar';
  const shouldReturnToCardView = returnTo === 'card-view';
  const shouldReturnToStudy = returnTo === 'study';

  // folderId の永続化（リロード時復元用）
  const targetFolderId = (() => {
    if (folderId) {
      sessionStorage.setItem(CARD_EDIT_FOLDER_ID_KEY, folderId);
      return folderId;
    }
    return sessionStorage.getItem(CARD_EDIT_FOLDER_ID_KEY) ?? '';
  })();

  const isUnloadingRef = useRef(false);

  useEffect(() => {
    const mark = () => { isUnloadingRef.current = true; };
    window.addEventListener('pagehide', mark);
    window.addEventListener('beforeunload', mark);
    return () => {
      window.removeEventListener('pagehide', mark);
      window.removeEventListener('beforeunload', mark);
    };
  }, []);

  const safeNavigate = useCallback((to) => {
    if (isUnloadingRef.current) return;
    navigate(to);
  }, [navigate]);

  const handleCardUpdated = useCallback(() => {
    sessionStorage.removeItem(CARD_EDIT_FOLDER_ID_KEY);
    if (shouldReturnToCalendar) {
      safeNavigate(createPageUrl('Calendar'));
    } else if (shouldReturnToCardView) {
      safeNavigate(`/CardView?folderId=${targetFolderId}${cardId ? `&cardId=${cardId}` : ''}`);
    } else if (shouldReturnToStudy) {
      safeNavigate(`/study?folderId=${targetFolderId}`);
    } else {
      safeNavigate(`/Folders?folderId=${targetFolderId}`);
    }
  }, [safeNavigate, shouldReturnToCalendar, shouldReturnToCardView, targetFolderId, cardId]);

  return (
    <div className="h-screen flex flex-col bg-[#F5F7F8] text-slate-800">
      <div className="flex-shrink-0 max-w-[1400px] w-full mx-auto px-0 md:pt-8 md:px-4">
        <div
          className="flex items-center mb-1 px-4 md:px-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCardUpdated}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto px-0 md:px-4">
        <CardEditorPane
          selectedCardId={cardId ?? '__new__'}
          folderId={targetFolderId}
          autoEdit={!!cardId}
          onCardUpdated={handleCardUpdated}
        />
      </div>
    </div>
  );
}
