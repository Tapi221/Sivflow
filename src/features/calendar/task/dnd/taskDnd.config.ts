import { type DropAnimation, MeasuringStrategy } from "@dnd-kit/core";

export const TASK_DND_MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.WhileDragging,
  },
};

export const TASK_DND_TABLIKE_EASING = "cubic-bezier(.16, 1, .3, 1)";
export const TASK_DND_LAYOUT_ANIMATION_DURATION_MS = 460;

export const TASK_DND_DROP_ANIMATION: DropAnimation | null = null;

export const TASK_DND_POINTER_ACTIVATION_DISTANCE = 6;
