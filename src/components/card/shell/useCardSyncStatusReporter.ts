import { useEffect } from "react";
import type { CardSyncStatus } from "./cardSyncStatus";



type UseCardSyncStatusReporterOptions = Readonly<{
  status: CardSyncStatus;
  onSyncStatusChange?: ((status: CardSyncStatus | null) => void) | null;
  isEnabled?: boolean;
}>;



const useCardSyncStatusReporter = ({ status, onSyncStatusChange = null, isEnabled = true }: UseCardSyncStatusReporterOptions): void => {
  useEffect(() => {
    if (!onSyncStatusChange || isEnabled) {
      return;
    }

    onSyncStatusChange(null);
  }, [isEnabled, onSyncStatusChange]);

  useEffect(() => {
    if (!onSyncStatusChange || !isEnabled) {
      return;
    }

    onSyncStatusChange(status);
  }, [isEnabled, onSyncStatusChange, status]);

  useEffect(() => {
    if (!onSyncStatusChange) {
      return;
    }

    return () => onSyncStatusChange(null);
  }, [onSyncStatusChange]);
};



export { useCardSyncStatusReporter };
