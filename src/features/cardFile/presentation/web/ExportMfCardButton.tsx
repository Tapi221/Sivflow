import { useState } from "react";
import { exportMfCardBytes } from "@/features/cardFile/application/exportMfCard";
import { MfCardExportError } from "@/features/cardFile/domain/mfCard.types";
import { downloadBytesAsMfCard } from "@/features/cardFile/infra/web/downloadMfCard";
import type { MfDeckTagLookup } from "@/features/deckFile/application/mfDeck.types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { Card } from "@/types";

export type ExportMfCardButtonProps = {
  card: Card | null | undefined;
  tagById?: MfDeckTagLookup;
  disabled?: boolean;
};

export const ExportMfCardButton = ({
  card,
  tagById,
  disabled = false,
}: ExportMfCardButtonProps) => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const label = isExporting ? "書き出し中..." : ".mfcard 書き出し";

  const handleExport = async () => {
    if (!card) {
      toast.error("書き出すカードが選択されていません。");
      return;
    }

    setIsExporting(true);

    try {
      const bytes = exportMfCardBytes({
        card,
        tagById,
      });

      downloadBytesAsMfCard({
        bytes,
        cardName: card.title || card.questionNumber || "sivflow-card",
      });

      toast.success("MFCard をエクスポートしました。");
    } catch (error) {
      console.error("[ExportMfCardButton] export failed", error);

      if (error instanceof MfCardExportError) {
        toast.error(error.issues[0]?.message ?? error.message);
        return;
      }

      toast.error("MFCard のエクスポートに失敗しました。");
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
      disabled={disabled || isExporting || !card}
      title={label}
      aria-label={label}
      className="min-w-0 max-w-[150px] overflow-hidden rounded-full bg-white/85 shadow-sm backdrop-blur"
    >
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </Button>
  );
};
