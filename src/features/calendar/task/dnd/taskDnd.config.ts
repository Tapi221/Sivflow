import {
  defaultDropAnimationSideEffects,
  type DropAnimation,
  MeasuringStrategy,
} from "@dnd-kit/core";

export const TASK_DND_MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export const TASK_DND_DROP_ANIMATION: DropAnimation = {
  duration: 110,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0",
      },
    },
  }),
};

export const TASK_DND_POINTER_ACTIVATION_DISTANCE = 4;
