import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type UIEvent } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { areListVirtualRangesEqual, buildListPlacementDays, buildListVirtualMetrics, getEventInstanceKey, get