import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type Args<T> = {
  enabled: boolean;
  value: T;
  onSave: (value: T) => Promise<void>;
  resetKey?: string | null;
  debounceMs?: number;
  throttleMs?: number;
};

export function useCardAutosave<T>({
  enabled,
  value,
  onSave,
  resetKey,
  debounceMs = 1200,
  throttleMs = 8000,
}: Args<T>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const latestRef = useRef(value);
  latestRef.current = value;

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  const debounceTimerRef = useRef<number | null>(null);
  const throttleTimerRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);

  const scheduleRef = useRef<() => void>(() => {});

  const flush = useCallback(async () => {
    if (!enabledRef.current) return;
    if (!dirtyRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;

    // ✅ この保存サイクルの対象として一旦dirtyを落とす
    // 保存中に編集が入れば markDirty でまた true になる
    dirtyRef.current = false;

    if (mountedRef.current) setStatus("saving");

    try {
      await onSaveRef.current(latestRef.current);

      if (mountedRef.current) {
        setStatus("saved");
        setLastSavedAt(Date.now());
      }
    } catch (e) {
      // 失敗したらdirtyに戻して次回に回す
      dirtyRef.current = true;
      if (mountedRef.current) setStatus("error");
      throw e;
    } finally {
      savingRef.current = false;

      // ✅ 保存中に編集が入ってdirtyが復活していたら、もう一回スケジュール
      if (dirtyRef.current) {
        if (mountedRef.current) setStatus("dirty");
        scheduleRef.current();
      }
    }
  }, []);

  const schedule = useCallback(() => {
    if (!enabledRef.current) return;

    // debounce
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = window.setTimeout(() => {
      const now = Date.now();
      const sinceLast = now - lastRunRef.current;

      // throttle (trailing)
      if (sinceLast < throttleMs) {
        if (!throttleTimerRef.current) {
          const wait = throttleMs - sinceLast;
          throttleTimerRef.current = window.setTimeout(() => {
            throttleTimerRef.current = null;
            lastRunRef.current = Date.now();
            void flush();
          }, wait);
        }
        return;
      }

      lastRunRef.current = now;
      void flush();
    }, debounceMs);
  }, [debounceMs, throttleMs, flush]);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const markDirty = useCallback(() => {
    if (!enabledRef.current) return;
    dirtyRef.current = true;

    // saving中は表示を崩さない（UI好みで調整してOK）
    setStatus((prev) => (prev === "saving" ? prev : "dirty"));

    scheduleRef.current();
  }, []);

  // reset on card change
  useEffect(() => {
    dirtyRef.current = false;
    savingRef.current = false;

    if (mountedRef.current) {
      setStatus("idle");
      setLastSavedAt(null);
    }

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    if (throttleTimerRef.current) window.clearTimeout(throttleTimerRef.current);

    debounceTimerRef.current = null;
    throttleTimerRef.current = null;
    lastRunRef.current = 0;
  }, [resetKey, enabled]);

  // flush on leave (best-effort)
  useEffect(() => {
    const onPageHide = () => {
      // ページ終了イベントは待ってくれないので、ここは「やれるだけやる」
      void flush();
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flush]);

  return { status, lastSavedAt, markDirty, flush };
}




