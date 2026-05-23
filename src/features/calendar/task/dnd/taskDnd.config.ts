import {
  defaultDropAnimationSideEffects,
  type DropAnimation,
  MeasuringStrategy,
} from "@dnd-kit/core";

export const TASK_DND_MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.WhileDragging,
  },
};

export const TASK_DND_TABLIKE_EASING = "cubic-bezier(.22, 1.08, .36, 1)";
export const TASK_DND_DROP_ANIMATION_DURATION_MS = 220;
export const TASK_DND_LAYOUT_ANIMATION_DURATION_MS = 220;

export const TASK_DND_DROP_ANIMATION: DropAnimation = {
  duration: TASK_DND_DROP_ANIMATION_DURATION_MS,
  easing: TASK_DND_TABLIKE_EASING,
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0",
      },
    },
  }),
};

export const TASK_DND_POINTER_ACTIVATION_DISTANCE = 6;
