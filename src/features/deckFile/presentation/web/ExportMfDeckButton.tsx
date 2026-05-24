import { useState } from "react";

import { exportMfDeckBytes } from "@/features/deckFile/application/exportMfDeck";
import type { MfDeckTagLookup } from "@/features/deckFile/application/types";
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

      toast.success("MFDeck exported.");
    } catch (error) {
      console.error("[ExportMfDeckButton] export failed", error);

      if (error instanceof MfDeckExportError) {
        toast.error(error.issues[0]?.message ?? error.message);
        return;
      }

      toast.error("MFDeck export failed.");
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
      {isExporting ? "Exporting..." : ".mfdeck export"}
    </Button>
  );
};
