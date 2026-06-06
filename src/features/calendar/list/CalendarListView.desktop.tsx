import { memo, useMemo, type MutableRefObject } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarEventChipList } from "@/chip/eventchip/EventChip.list";
import { buildListPlacementDays, getEventInstanceKey, type CalendarListPlacementDay } from "@/chip/eventchip/EventChip.list.placement";
import type { ScheduleVirtualRail } from "@/features