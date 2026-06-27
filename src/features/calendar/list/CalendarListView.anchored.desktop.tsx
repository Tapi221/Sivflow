import { memo, useCallback, useLayoutEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { CalendarListView } from "./CalendarListView.desktop";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarListViewAnchoredProps = {
  days: Date[];
  virtualRail?: ScheduleVirtualRail;
  events: GoogleCalendarEvent[];
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  onVisibleMonthChange?: (date: Date) => void;
  dayHeights?: Record<string, number>;
  scrollViewportRef?: MutableRefObject<HTMLDivElement | null>;
  onScrollTopChange?: (scrollTop: number) => void;
  scrollTargetDate?: Date;
  scrollTargetToken?: number;
  className?: string;
};
type ListViewportAnchor = {
  labelPrefix: string;
  viewportTop: number;
};



const LIST_SCROLL_RESTORE_EPSILON_PX = 0.5;
const WEEKDAY_SUFFIX = "曜日";



const getDateLabelPrefix = (label: string): string | null => {
  const weekdayEnd = label.indexOf(WEEKDAY_SUFFIX);
  if (weekdayEnd < 0) return null;
  return label.slice(0, weekdayEnd + WEEKDAY_SUFFIX.length);
};
const getListSections = (element: HTMLDivElement): HTMLElement[] => Array.from(element.getElementsByTagName("section")).filter((section) => section.hasAttribute("aria-label"));
const findViewportAnchor = (element: HTMLDivElement): ListViewportAnchor | null => {
  const viewportTop = element.getBoundingClientRect().top;
  let anchor: ListViewportAnchor | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  getListSections(element).forEach((section) => {
    const labelPrefix = getDateLabelPrefix(section.getAttribute("aria-label") ?? "");
    if (!labelPrefix) return;
    const sectionViewportTop = section.getBoundingClientRect().top - viewportTop;
    const distance = Math.abs(sectionViewportTop);
    if (distance >= nearestDistance) return;
    anchor = { labelPrefix, viewportTop: sectionViewportTop };
    nearestDistance = distance;
  });
  return anchor;
};
const findSectionByAnchor = (element: HTMLDivElement, anchor: ListViewportAnchor): HTMLElement | null => getListSections(element).find((section) => (section.getAttribute("aria-label") ?? "").startsWith(anchor.labelPrefix)) ?? null;
const restoreViewportAnchor = (element: HTMLDivElement, anchor: ListViewportAnchor): boolean => {
  const section = findSectionByAnchor(element, anchor);
  if (!section) return false;
  const currentViewportTop = section.getBoundingClientRect().top - element.getBoundingClientRect().top;
  const scrollTopDelta = currentViewportTop - anchor.viewportTop;
  if (Math.abs(scrollTopDelta) <= LIST_SCROLL_RESTORE_EPSILON_PX) return false;
  element.scrollTop += scrollTopDelta;
  return true;
};



const CalendarListViewAnchoredComponent = ({ scrollViewportRef: externalRef, onScrollTopChange, events, ...props }: CalendarListViewAnchoredProps) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = externalRef ?? localRef;
  const anchorRef = useRef<ListViewportAnchor | null>(null);
  const isRestoringRef = useRef(false);
  const handleScrollTopChange = useCallback((scrollTop: number) => {
    const element = scrollViewportRef.current;
    if (isRestoringRef.current) return;
    if (element) {
      anchorRef.current = findViewportAnchor(element);
    }
    onScrollTopChange?.(scrollTop);
  }, [onScrollTopChange, scrollViewportRef]);
  useLayoutEffect(() => {
    const element = scrollViewportRef.current;
    const anchor = anchorRef.current;
    if (!element || !anchor) return;
    isRestoringRef.current = true;
    restoreViewportAnchor(element, anchor);
    isRestoringRef.current = false;
  }, [events, scrollViewportRef]);
  useLayoutEffect(() => {
    const element = scrollViewportRef.current;
    if (!element || isRestoringRef.current) return;
    anchorRef.current = findViewportAnchor(element);
  });
  return <CalendarListView {...props} events={events} scrollViewportRef={scrollViewportRef} onScrollTopChange={handleScrollTopChange} />;
};



const CalendarListViewAnchored = memo(CalendarListViewAnchoredComponent);
CalendarListViewAnchored.displayName = "CalendarListViewAnchored";

export { CalendarListViewAnchored };
