const LIST_SCROLL_RESTORE_EPSILON_PX = 0.5;

const getNextScrollTop = (currentScrollTop: number, currentTop: number, previousTop: number): number => {
  const delta = currentTop - previousTop;
  if (Math.abs(delta) <= LIST_SCROLL_RESTORE_EPSILON_PX) return currentScrollTop;
  return currentScrollTop + delta;
};

export { getNextScrollTop };
