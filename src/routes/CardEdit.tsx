import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CardEditorPane } from "@/components/folder/panes/CardEditorPane";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@/ui/icons";

import {
  createAppDestination,
  createPageUrl,
} from "@/platform/web/navigation/toWebPath";

const CARD_EDIT_FOLDER_ID_KEY = "card-edit:folder-id";
const TITLEBAR_HEIGHT_PX = 36;

const CardEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const cardId = searchParams.get("id");
  const folderId = searchParams.get("folderId");
  const returnTo = searchParams.get("returnTo");

  const shouldReturnToCalendar = returnTo === "calendar";
  const shouldReturnToCardSetView =
    returnTo === "cardsetview" || returnTo === "card-view";
  const shouldReturnToStudy = returnTo === "study";

  const targetFolderId = (() => {
    if (folderId) {
      sessionStorage.setItem(CARD_EDIT_FOLDER_ID_KEY, folderId);
      return folderId;
    }
    return sessionStorage.getItem(CARD_EDIT_FOLDER_ID_KEY) ?? "";
  })();

  const isUnloadingRef = useRef(false);

  useEffect(() => {
    const mark = () => {
      isUnloadingRef.current = true;
    };

    window.addEventListener("pagehide", mark);
    window.addEventListener("beforeunload", mark);

    return () => {
      window.removeEventListener("pagehide", mark);
      window.removeEventListener("beforeunload", mark);
    };
  }, []);

  const safeNavigate = useCallback(
    (to: string) => {
      if (isUnloadingRef.current) return;
      navigate(to);
    },
    [navigate],
  );

  const handleCardUpdated = useCallback(() => {
    sessionStorage.removeItem(CARD_EDIT_FOLDER_ID_KEY);

    if (shouldReturnToCalendar) {
      safeNavigate(createPageUrl("Calendar"));
    } else if (shouldReturnToCardSetView) {
      safeNavigate(
        createPageUrl(
          createAppDestination("cardSetView", {
            folderId: targetFolderId,
            ...(cardId ? { cardId } : {}),
          }),
        ),
      );
    } else if (shouldReturnToStudy) {
      safeNavigate(
        createPageUrl(
          createAppDestination("studyMode", { folderId: targetFolderId }),
        ),
      );
    } else {
      safeNavigate(
        createPageUrl(
          createAppDestination("folders", { folderId: targetFolderId }),
        ),
      );
    }
  }, [
    safeNavigate,
    shouldReturnToCalendar,
    shouldReturnToCardSetView,
    shouldReturnToStudy,
    targetFolderId,
    cardId,
  ]);

  return (
    <div className="relative h-full min-h-0 bg-transparent text-slate-800">
      <div
        className="pointer-events-none absolute inset-x-0 z-30 hidden md:block"
        style={{ top: `${TITLEBAR_HEIGHT_PX + 12}px` }}
      >
        <div className="mx-auto flex max-w-[1400px] px-4">
          <div className="pointer-events-auto">
            <Button variant="ghost" size="icon" onClick={handleCardUpdated}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="h-full min-h-0 max-w-[1400px] w-full mx-auto px-0 md:px-4">
        <CardEditorPane
          selectedCardId={cardId ?? "__new__"}
          folderId={targetFolderId}
          autoEdit={!!cardId}
          onCardUpdated={handleCardUpdated}
          overlayTopInsetPx={TITLEBAR_HEIGHT_PX}
          presentationContext={{
            isCurrentCard: true,
            isStandaloneEditor: true,
            hasFocusWithin: true,
          }}
        />
      </div>
    </div>
  );
};

export default CardEdit;
