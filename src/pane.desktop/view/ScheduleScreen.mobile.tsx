import { type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { CarvePanel } from "@/components/panel/CarvePanel.desktop";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import { attach