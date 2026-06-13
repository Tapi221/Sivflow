import { useCallback, useEffect, useRef } from "react";



type CalendarEventDragPointerSnapshot = {
  pointerId: number;
  buttons: number;
  clientX: number;
  clientY: number;
};
type CalendarEventDragRepeatActionStep<TDirection extends string> = (direction: TDirection, snapshot: CalendarEventDragPointerSnapshot) => boolean | void;
type CalendarEventDragRepeatActionOptions<TDirection extends string> = {
  repeatIntervalMs: number;
  getDirection: (snapshot: CalendarEventDragPointerSnapshot) => TDirection | null;
  onStep: CalendarEventDragRepeatActionStep<TDirection>;
};
type CalendarEventDragRepeatActionControls = {
  begin: (snapshot: CalendarEventDragPointerSnapshot) => void;
  update: (snapshot: CalendarEventDragPointerSnapshot) => void;
  stop: (pointerId?: number) => void;
  getSnapshot: () => CalendarEventDragPointerSnapshot | null;
};



const PRIMARY_BUTTONS_MASK = 1;



const isPrimaryButtonDragSnapshot = (snapshot: CalendarEventDragPointerSnapshot): boolean => (snapshot.buttons & PRIMARY_BUTTONS_MASK) === PRIMARY_BUTTONS_MASK;
const cancelAnimationFrameIfNeeded = (frameId: number | null): void => {
  if (frameId === null || typeof window === "undefined") return;

  window.cancelAnimationFrame(frameId);
};
const createCalendarEventDragPointerSnapshot = (pointerId: number, buttons: number, clientX: number, clientY: number): CalendarEventDragPointerSnapshot => ({ pointerId, buttons, clientX, clientY });
const useCalendarEventDragRepeatAction = <TDirection extends string>({ repeatIntervalMs, getDirection, onStep }: CalendarEventDragRepeatActionOptions<TDirection>): CalendarEventDragRepeatActionControls => {
  const optionsRef = useRef<CalendarEventDragRepeatActionOptions<TDirection>>({ repeatIntervalMs, getDirection, onStep });
  const pointerIdRef = useRef<number | null>(null);
  const pointerSnapshotRef = useRef<CalendarEventDragPointerSnapshot | null>(null);
  const directionRef = useRef<TDirection | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastStepAtRef = useRef<number | null>(null);
  const runFrameRef = useRef<(timestamp: number) => void>(() => undefined);
  const stopRef = useRef<(pointerId?: number) => void>(() => undefined);

  optionsRef.current = { repeatIntervalMs, getDirection, onStep };

  const pause = useCallback(() => {
    cancelAnimationFrameIfNeeded(frameRef.current);
    frameRef.current = null;
    directionRef.current = null;
    lastStepAtRef.current = null;
  }, []);

  const runFrame = useCallback((timestamp: number) => {
    const snapshot = pointerSnapshotRef.current;
    const direction = directionRef.current;

    if (!snapshot || !direction || !isPrimaryButtonDragSnapshot(snapshot)) {
      stopRef.current(snapshot?.pointerId);
      return;
    }

    const shouldStep = lastStepAtRef.current === null || timestamp - lastStepAtRef.current >= optionsRef.current.repeatIntervalMs;
    if (shouldStep) {
      const shouldContinue = optionsRef.current.onStep(direction, snapshot);
      lastStepAtRef.current = timestamp;
      if (shouldContinue === false) {
        pause();
        return;
      }
    }

    frameRef.current = window.requestAnimationFrame(runFrameRef.current);
  }, [pause]);

  runFrameRef.current = runFrame;

  const startFrame = useCallback(() => {
    if (frameRef.current !== null || typeof window === "undefined") return;

    frameRef.current = window.requestAnimationFrame(runFrameRef.current);
  }, []);

  const stop = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && pointerIdRef.current !== pointerId) return;

    pointerIdRef.current = null;
    pointerSnapshotRef.current = null;
    pause();
  }, [pause]);

  stopRef.current = stop;

  const update = useCallback((snapshot: CalendarEventDragPointerSnapshot) => {
    if (pointerIdRef.current !== snapshot.pointerId) return;

    pointerSnapshotRef.current = snapshot;
    if (!isPrimaryButtonDragSnapshot(snapshot)) {
      stop(snapshot.pointerId);
      return;
    }

    const direction = optionsRef.current.getDirection(snapshot);
    if (!direction) {
      pause();
      return;
    }

    if (directionRef.current !== direction) {
      directionRef.current = direction;
      lastStepAtRef.current = null;
    }

    startFrame();
  }, [pause, startFrame, stop]);

  const begin = useCallback((snapshot: CalendarEventDragPointerSnapshot) => {
    pointerIdRef.current = snapshot.pointerId;
    pointerSnapshotRef.current = snapshot;
    update(snapshot);
  }, [update]);

  const getSnapshot = useCallback(() => pointerSnapshotRef.current, []);

  useEffect(() => () => pause(), [pause]);

  return { begin, update, stop, getSnapshot };
};



export { createCalendarEventDragPointerSnapshot, useCalendarEventDragRepeatAction };


export type { CalendarEventDragPointerSnapshot };
