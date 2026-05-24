import { useState } from "react";

import { exportMfDeckBytes } from "@/features/deckFile/application/exportMfDeck";
import type { MfDeckTagLookup } from "@/features/deckFile/application/mfDeck.types";
import { MfDeckExportError } from "@/features/deckFile/domain/mfDeckTypes";
import { downloadBytesAsMfDeck } from "@/features/deckFile/infra/web/downloadMfDeck";

import { Button } from "@/components/ui/button";

import { useToast } from "@/contexts/ToastContext";
import type { Card, CardSet } from "@/types";

export type ExportMfDeckButtonProps = {
  cardSet: CardSet;
  cards: Card[];
  tagById?: MfDeckTagLookup;
  disabled?: boolean;
};

export const ExportMfDeckButton = ({
  cardSet,
  cards,
  tagById,
  disabled = false,
}: ExportMfDeckButtonProps) => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const bytes = await exportMfDeckBytes({
        cardSet,
        cards,
        tagById,
      });

      downloadBytesAsMfDeck({
        bytes,
        deckName: cardSet.name || "manifolia-deck",
      });

      toast.success("MFDeck \u3092\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u3057\u307e\u3057\u305f\u3002");
    } catch (error) {
      console.error("[ExportMfDeckButton] export failed", error);

      if (error instanceof MfDeckExportError) {
        toast.error(error.issues[0]?.message ?? error.message);
        return;
      }

      toast.error("MFDeck \u306e\u30a8\u30af\u30b9\u30dd\u30fc\u30c8\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
      className="rounded-full bg-white/85 shadow-sm backdrop-blur"
    >
      {isExporting ? "\u66f8\u304d\u51fa\u3057\u4e2d..." : ".mfdeck \u66f8\u304d\u51fa\u3057"}
    </Button>
  );
};
