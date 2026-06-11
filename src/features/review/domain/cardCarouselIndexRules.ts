const clampCardCarouselIndex = (index: number, itemCount: number) => {
  if (itemCount <= 0) {
    return 0;
  }

  if (!Number.isFinite(index)) {
    return 0;
  }

  const roundedIndex = Math.round(index);
  return Math.min(itemCount - 1, Math.max(0, roundedIndex));
};
const canGoToPreviousCardCarouselItem = (activeIndex: number) => {
  return activeIndex > 0;
};
const canGoToNextCardCarouselItem = (activeIndex: number, itemCount: number) => {
  return activeIndex < Math.max(0, itemCount - 1);
};
const isNearCardCarouselItem = ({ activeIndex, targetIndex, radius }: { activeIndex: number;
  targetIndex: number;
  radius: number;
}) => {
  return Math.abs(targetIndex - activeIndex) <= radius;
};
const shouldNotifyCardCarouselIndexChange = ({ nextIndex, previousIndex }: { nextIndex: number;
  previousIndex: number;
}) => {
  return nextIndex !== previousIndex;
};



export { clampCardCarouselIndex, canGoToPreviousCardCarouselItem, canGoToNextCardCarouselItem, isNearCardCarouselItem, shouldNotifyCardCarouselIndexChange };
