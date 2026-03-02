import React, { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CardEditorPane } from '@/components/folder/CardEditorPane';

export default function PairMode() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  const navigate = useNavigate();
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

  const handleCardUpdated = useCallback(() => {
    if (isUnloadingRef.current) return;
    navigate(`/Folders?folderId=${folderId}`);
  }, [navigate, folderId]);

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
          selectedCardId="__new__"
          folderId={folderId ?? ''}
          onCardUpdated={handleCardUpdated}
        />
      </div>
    </div>
  );
}
