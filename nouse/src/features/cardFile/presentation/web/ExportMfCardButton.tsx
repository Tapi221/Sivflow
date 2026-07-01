import { useState } from "react";
import { Button } from "@web-renderer/chip/button/button/button";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { useToast } from "@web-renderer/contexts/ToastContext";
import { exportMfCardBytes } from "@/features/cardFile/application/exportMfCard";
import { MfCardExportError } from "@/features/cardFile/domain/mfCard.types";
import { downloadBytesAsMfCard } from "@/features/cardFile/infra/web/downloadMfCard";
import type { MfDeckTagLookup } from "@/features/deckFile/application/mfDeck.types";
import type { Card } from "@/types";



type ExportMfCardButtonProps = {
  card: Card | null | undefined;
  tagById?: MfDeckTagLookup;
  disabled?: boolean;
};



const ExportMfCardButton = ({
  card,
  tagById,
  disabled = false,
}: ExportMfCardButtonProps) => {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const label = ".mfcard 書き出し";

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
        cardName: (card.title || card.questionNumber) ?? "sivflow-card",
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
      aria-label={isExporting ? "MFCardを書き出し中" : label}
      className="min-w-0 max-w-36 overflow-hidden rounded-full bg-white/85 shadow-sm backdrop-blur"
    >
      {isExporting ? (
        <LoadingSpinner iconClassName="h-4 w-4" label="MFCardを書き出し中" />
      ) : (
        <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
      )}
    </Button>
  );
};



export { ExportMfCardButton };


export type { ExportMfCardButtonProps };
