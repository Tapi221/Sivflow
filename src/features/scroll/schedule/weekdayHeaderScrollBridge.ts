const isHTMLElement = (value: unknown): value is HTMLElement =>
  value instanceof HTMLElement;

const findWeekdayHeaderScroller = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return null;

  const candidate = target.closest(".flex-1.overflow-hidden.bg-white");

  if (!isHTMLElement(candidate)) return null;

  const parent = candidate.parentElement;
  const firstColumn = candidate.previousElementSibling;
  const grid = candidate.firstElementChild;

  if (!parent || !isHTMLElement(firstColumn) || !isHTMLElement(grid)) {
    return null;
  }

  const isWeekdayHeader =
    parent.classList.contains("flex") &&
    parent.classList.contains("shrink-0") &&
    firstColumn.classList.contains("shrink-0") &&
    firstColumn.classList.contains("border-r") &&
    grid.style.display === "grid";

  return isWeekdayHeader ? candidate : null;
};

const findSiblingScroller = (
  weekdayHeaderScroller: HTMLElement,
  predicate: (element: HTMLElement) => boolean,
) => {
  const calendarRoot = weekdayHeaderScroller.parentElement?.parentElement;

  if (!calendarRoot) return null;

  return Array.from(calendarRoot.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && predicate(child),
  ) ?? null;
};

const syncHorizontalScroll = (
  scrollLeft: number,
  ...scrollers: Array<HTMLElement | null>
) => {
  for (const scroller of scrollers) {
    if (scroller && scroller.scrollLeft !== scrollLeft) {
      scroller.scrollLeft = scrollLeft;
    }
  }
};

const handleWheel = (event: WheelEvent) => {
  const headerScroller = findWeekdayHeaderScroller(event.target);

  if (!headerScroller) return;

  const bodyScroller = findSiblingScroller(
    headerScroller,
    (element) =>
      element.classList.contains("min-h-0") &&
      element.classList.contains("overflow-auto"),
  );

  if (!bodyScroller) return;

  const allDayRow = findSiblingScroller(
    headerScroller,
    (element) =>
      element !== headerScroller.parentElement &&
      element.classList.contains("flex") &&
      element.classList.contains("shrink-0"),
  );
  const allDayScroller = allDayRow?.lastElementChild;
  const horizontalDelta = event.shiftKey && event.deltaX === 0
    ? event.deltaY
    : event.deltaX;

  if (horizontalDelta === 0 && event.deltaY === 0) return;

  event.preventDefault();
  bodyScroller.scrollBy({
    left: horizontalDelta,
    top: event.shiftKey ? 0 : event.deltaY,
    behavior: "auto",
  });
  syncHorizontalScroll(
    bodyScroller.scrollLeft,
    headerScroller,
    isHTMLElement(allDayScroller) ? allDayScroller : null,
  );
};

window.addEventListener("wheel", handleWheel, { passive: false });
