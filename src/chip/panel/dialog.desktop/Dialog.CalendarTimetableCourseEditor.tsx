import { useCallback, useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import type { CalendarTimetableColorKey, CalendarTimetableCourse, CalendarTimetableCourseDraft, CalendarTimetablePeriod, CalendarTimetableSlot, CalendarTimetableVisibleDayCount, CalendarTimetableWeekdayIndex } from "@core/domain/calendar/timetable/timetable.types";
import * as stratisIcons from "stratis-ui-icons";
import { TAG_COLOR_KEYS } from "@/chip/tag/tag.constants";
import { getTagColorStyle } from "@/chip/tag/tag.style";
import { cn } from "@/lib/utils";

type CalendarTimetableCourseEditorDialogProps = {
  course: CalendarTimetableCourse | null;
  semesterId: string;
  initialSlot: CalendarTimetableSlot | null;
  periods: CalendarTimetablePeriod[];
  visibleDayCount: CalendarTimetableVisibleDayCount;
  onSave: (draft: CalendarTimetableCourseDraft) => Promise<void>;
  onDelete: (courseId: string) => Promise<void>;
  onClose: () => void;
};
type StratisIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const STRATIS_ICON_COMPONENTS = stratisIcons as Record<string, StratisIconComponent | undefined>;
const STRATIS_CHECK_ICON_NAMES = ["StratisCheckIcon", "StratisCheck01Icon", "StratisCheckCircleContainedIcon"] as const;
const StratisCheckIcon = STRATIS_CHECK_ICON_NAMES.map((name) => STRATIS_ICON_COMPONENTS[name]).find((Icon): Icon is StratisIconComponent => Boolean(Icon)) ?? null;
const TIMETABLE_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const DEFAULT_COURSE_COLOR_KEY: CalendarTimetableColorKey = "blue";
const EMPTY_SLOT_LIST: CalendarTimetableSlot[] = [];

const isSameTimetableSlot = (left: CalendarTimetableSlot, right: CalendarTimetableSlot): boolean => left.dayIndex === right.dayIndex && left.periodId === right.periodId;
const createEditorSlots = (course: CalendarTimetableCourse | null, initialSlot: CalendarTimetableSlot | null): CalendarTimetableSlot[] => course?.slots ?? (initialSlot ? [initialSlot] : EMPTY_SLOT_LIST);
const getTimetableEntryStyle = (colorKey: CalendarTimetableColorKey) => getTagColorStyle(colorKey);

const CalendarTimetableCourseEditorDialog = ({ course, semesterId, initialSlot, periods, visibleDayCount, onSave, onDelete, onClose }: CalendarTimetableCourseEditorDialogProps) => {
  const [title, setTitle] = useState(course?.title ?? "");
  const [room, setRoom] = useState(course?.room ?? "");
  const [teacher, setTeacher] = useState(course?.teacher ?? "");
  const [memo, setMemo] = useState(course?.memo ?? "");
  const [colorKey, setColorKey] = useState<CalendarTimetableColorKey>(course?.colorKey ?? DEFAULT_COURSE_COLOR_KEY);
  const [slots, setSlots] = useState<CalendarTimetableSlot[]>(() => createEditorSlots(course, initialSlot));
  useEffect(() => {
    setTitle(course?.title ?? "");
    setRoom(course?.room ?? "");
    setTeacher(course?.teacher ?? "");
    setMemo(course?.memo ?? "");
    setColorKey(course?.colorKey ?? DEFAULT_COURSE_COLOR_KEY);
    setSlots(createEditorSlots(course, initialSlot));
  }, [course, initialSlot]);
  const toggleSlot = useCallback((slot: CalendarTimetableSlot) => {
    setSlots((currentSlots) => currentSlots.some((currentSlot) => isSameTimetableSlot(currentSlot, slot)) ? currentSlots.filter((currentSlot) => !isSameTimetableSlot(currentSlot, slot)) : [...currentSlots, slot]);
  }, []);
  const handleSave = useCallback(() => {
    void onSave({ id: course?.id, semesterId, syllabusCourseId: course?.syllabusCourseId, institutionId: course?.institutionId, departmentId: course?.departmentId, title, room, teacher, memo, colorKey, slots, createdAt: course?.createdAt }).then(onClose);
  }, [colorKey, course, memo, onClose, onSave, room, semesterId, slots, teacher, title]);
  const handleDelete = useCallback(() => {
    if (!course) return;
    void onDelete(course.id).then(onClose);
  }, [course, onClose, onDelete]);
  const isSaveDisabled = slots.length === 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6" role="dialog" aria-modal="true" aria-label="授業編集">
      <div className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[22px] border border-[#e5e5ea] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
          <h2 className="text-[17px] font-bold tracking-[-0.03em] text-[#1c1c1e]">{course ? "授業を編集" : "授業を追加"}</h2>
          <button type="button" className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#6e6e73] hover:bg-[#f7f7f8]" onClick={onClose}>閉じる</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3">
            <input className="h-11 rounded-[14px] border border-[#e5e5ea] px-3 text-[15px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="授業名（空欄なら授業）" />
            <div className="grid grid-cols-2 gap-3">
              <input className="h-10 rounded-[12px] border border-[#e5e5ea] px-3 text-[14px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="教室" />
              <input className="h-10 rounded-[12px] border border-[#e5e5ea] px-3 text-[14px] font-semibold text-[#1c1c1e] outline-none focus:border-[#007aff]" value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="担当教員" />
            </div>
            <textarea className="min-h-[72px] rounded-[12px] border border-[#e5e5ea] px-3 py-2 text-[14px] font-medium text-[#1c1c1e] outline-none focus:border-[#007aff]" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="メモ" />
            <>
              <div className="mb-2 text-[12px] font-bold text-[#6e6e73]">色</div>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_KEYS.map((key) => <button key={key} type="button" className={cn("h-8 w-8 rounded-full border-2", colorKey === key ? "border-[#007aff]" : "border-transparent")} style={getTimetableEntryStyle(key)} onClick={() => setColorKey(key)} aria-label={`色 ${key}`} />)}
              </div>
            </>
            <>
              <div className="mb-2 text-[12px] font-bold text-[#6e6e73]">曜日・時限</div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `52px repeat(${visibleDayCount}, minmax(0, 1fr))` }}>
                <div />
                {TIMETABLE_DAY_LABELS.slice(0, visibleDayCount).map((label) => <div key={label} className="text-center text-[12px] font-bold text-[#6e6e73]">{label}</div>)}
                {periods.map((period) => <div key={period.id} className="contents"><div className="flex items-center justify-end pr-2 text-[12px] font-bold text-[#6e6e73]">{period.label}</div>{TIMETABLE_DAY_LABELS.slice(0, visibleDayCount).map((_, dayIndex) => {
                  const slot = { dayIndex: dayIndex as CalendarTimetableWeekdayIndex, periodId: period.id };
                  const selected = slots.some((currentSlot) => isSameTimetableSlot(currentSlot, slot));
                  return <button key={`${dayIndex}-${period.id}`} type="button" className={cn("flex h-9 items-center justify-center rounded-[10px] border text-[12px] font-bold", selected ? "border-[#007aff] bg-[#e8f2ff] text-[#007aff]" : "border-[#e5e5ea] bg-white text-[#c7c7cc]")} onClick={() => toggleSlot(slot)}>{selected && StratisCheckIcon ? <StratisCheckIcon className="h-4 w-4" aria-hidden="true" focusable="false" /> : null}</button>;
                })}</div>)}
              </div>
            </>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-[#f0f0f2] px-5 py-4">
          <button type="button" className="rounded-full px-3 py-2 text-[13px] font-bold text-[#ff3b30] disabled:text-[#c7c7cc]" disabled={!course} onClick={handleDelete}>削除</button>
          <button type="button" className="rounded-full bg-[#007aff] px-5 py-2 text-[14px] font-bold text-white disabled:bg-[#c7c7cc]" disabled={isSaveDisabled} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export { CalendarTimetableCourseEditorDialog };
