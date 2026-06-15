import { useCallback, useMemo, useState } from "react";
import { isValidCalendarTimetableWeekdayIndex } from "@core/domain/calendar/timetable/timetable.model";
import type { CalendarTimetableColorKey, CalendarTimetableInstitution, CalendarTimetableInstitutionKind, CalendarTimetablePeriod, CalendarTimetableSyllabusCourse, CalendarTimetableSyllabusCourseDisplay, CalendarTimetableSyllabusCourseDraft, CalendarTimetableWeekdayIndex } from "@core/domain/calendar/timetable/timetable.types";
import { TAG_COLOR_KEYS } from "@shared/design-tokens/color/Color.Tag";
import { getTagColorStyle } from "@/chip/budge/tag/tagColor";
import { cn } from "@/lib/utils";

type CalendarTimetableSyllabusCatalogDialogProps = {
  activeSemesterId: string;
  institutions: CalendarTimetableInstitution[];
  periods: CalendarTimetablePeriod[];
  syllabusCourses: CalendarTimetableSyllabusCourseDisplay[];
  onSearch: (query: string, institutionId?: string | null, departmentId?: string | null) => Promise<CalendarTimetableSyllabusCourseDisplay[]>;
  onSaveSyllabusCourse: (draft: CalendarTimetableSyllabusCourseDraft) => Promise<void>;
  onAddCourseFromSyllabus: (syllabusCourse: CalendarTimetableSyllabusCourse, semesterId: string) => Promise<void>;
  onClose: () => void;
};
type SyllabusSlotDraft = {
  dayIndex: CalendarTimetableWeekdayIndex;
  periodLabel: string;
};

const TIMETABLE_DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const DEFAULT_COURSE_COLOR_KEY: CalendarTimetableColorKey = "blue";
const DEFAULT_INSTITUTION_KIND: CalendarTimetableInstitutionKind = "university";
const EMPTY_SLOT_DRAFTS: SyllabusSlotDraft[] = [];

const createInitialSlotDraft = (periods: CalendarTimetablePeriod[]): SyllabusSlotDraft[] => periods[0] ? [{ dayIndex: 0, periodLabel: periods[0].label }] : EMPTY_SLOT_DRAFTS;
const formatSyllabusCourseSlots = (course: CalendarTimetableSyllabusCourse): string => course.slots.map((slot) => `${TIMETABLE_DAY_LABELS[slot.dayIndex]}${slot.periodLabel}`).join(" / ");
const getSyllabusCourseSlotsLabel = (course: CalendarTimetableSyllabusCourse): string => {
  const slotsLabel = formatSyllabusCourseSlots(course);
  return slotsLabel.trim() === "" ? "時限未設定" : slotsLabel;
};

const CalendarTimetableSyllabusCatalogDialog = ({ activeSemesterId, institutions, periods, syllabusCourses, onSearch, onSaveSyllabusCourse, onAddCourseFromSyllabus, onClose }: CalendarTimetableSyllabusCatalogDialogProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CalendarTimetableSyllabusCourseDisplay[]>(syllabusCourses);
  const [institutionName, setInstitutionName] = useState("");
  const [institutionKind, setInstitutionKind] = useState<CalendarTimetableInstitutionKind>(DEFAULT_INSTITUTION_KIND);
  const [facultyName, setFacultyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [title, setTitle] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("");
  const [credits, setCredits] = useState("");
  const [memo, setMemo] = useState("");
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [colorKey, setColorKey] = useState<CalendarTimetableColorKey>(DEFAULT_COURSE_COLOR_KEY);
  const [slots, setSlots] = useState<SyllabusSlotDraft[]>(() => createInitialSlotDraft(periods));
  const canSave = institutionName.trim().length > 0 && departmentName.trim().length > 0 && title.trim().length > 0;
  const catalogCountLabel = useMemo(() => `${syllabusCourses.length}件`, [syllabusCourses.length]);
  const handleSearch = useCallback(() => {
    void onSearch(query).then(setResults);
  }, [onSearch, query]);
  const handleAddSlot = useCallback(() => {
    const firstPeriod = periods[0];
    if (!firstPeriod) return;
    setSlots((currentSlots) => [...currentSlots, { dayIndex: 0, periodLabel: firstPeriod.label }]);
  }, [periods]);
  const handleUpdateSlot = useCallback((index: number, slot: SyllabusSlotDraft) => {
    setSlots((currentSlots) => currentSlots.map((currentSlot, currentIndex) => currentIndex === index ? slot : currentSlot));
  }, []);
  const handleDeleteSlot = useCallback((index: number) => {
    setSlots((currentSlots) => currentSlots.filter((_, currentIndex) => currentIndex !== index));
  }, []);
  const handleSave = useCallback(() => {
    if (!canSave) return;
    void onSaveSyllabusCourse({ institutionName, institutionKind, facultyName, departmentName, title, room, teacher, semesterLabel, credits, memo, syllabusUrl, colorKey, slots }).then(() => onSearch(query).then(setResults));
  }, [canSave, colorKey, credits, departmentName, facultyName, institutionKind, institutionName, memo, onSaveSyllabusCourse, onSearch, query, room, semesterLabel, slots, syllabusUrl, teacher, title]);
  const handleAddCourse = useCallback((course: CalendarTimetableSyllabusCourseDisplay) => {
    void onAddCourseFromSyllabus(course, activeSemesterId);
  }, [activeSemesterId, onAddCourseFromSyllabus]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 py-6" role="dialog" aria-modal="true" aria-label="授業DB">
      <div className="flex max-h-full w-full max-w-96 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f2] px-5 py-4">
          <div className="min-w-0"><h2 className="text-base font-bold text-zinc-900">授業DB</h2><p className="mt-1 text-xs font-medium text-zinc-500">大学・学部・授業を登録して時間割に追加</p></div>
          <button type="button" className="rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50" onClick={onClose}>閉じる</button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-[#f0f0f2] px-5 py-4 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between"><div className="text-xs font-bold text-zinc-900">授業を登録</div><div className="rounded-full bg-zinc-50 px-2 py-1 text-xs font-bold text-zinc-500">{catalogCountLabel}</div></div>
            {institutions.length > 0 ? <div className="mb-3 flex flex-wrap gap-2">{institutions.slice(0, 8).map((institution) => <button key={institution.id} type="button" className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-500" onClick={() => setInstitutionName(institution.name)}>{institution.name}</button>)}</div> : null}
            <div className="grid gap-2">
              <input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="大学・専門学校名" />
              <select className="h-10 rounded-xl border px-3 text-xs font-semibold" value={institutionKind} onChange={(event) => setInstitutionKind(event.target.value as CalendarTimetableInstitutionKind)} aria-label="学校種別"><option value="university">大学</option><option value="vocational">専門学校</option><option value="college">短大</option><option value="other">その他</option></select>
              <input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={facultyName} onChange={(event) => setFacultyName(event.target.value)} placeholder="学部" />
              <input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="学科・専攻" />
              <input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="授業名" />
              <div className="grid grid-cols-2 gap-2"><input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="教室" /><input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="担当教員" /></div>
              <div className="grid grid-cols-2 gap-2"><input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={semesterLabel} onChange={(event) => setSemesterLabel(event.target.value)} placeholder="前期 / 春学期" /><input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={credits} onChange={(event) => setCredits(event.target.value)} placeholder="単位数" /></div>
              <input className="h-10 rounded-xl border px-3 text-xs font-semibold" value={syllabusUrl} onChange={(event) => setSyllabusUrl(event.target.value)} placeholder="シラバスURL" />
              <textarea className="min-h-16 rounded-xl border px-3 py-2 text-xs font-medium" value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="メモ" />
              <><div className="mb-2 text-xs font-bold text-zinc-500">色</div><div className="flex flex-wrap gap-1.5">{TAG_COLOR_KEYS.map((key) => <button key={key} type="button" className={cn("h-7 w-7 rounded-full border-2", colorKey === key ? "border-[#007aff]" : "border-transparent")} style={getTagColorStyle(key)} onClick={() => setColorKey(key)} aria-label={`色 ${key}`} />)}</div></>
              <><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-zinc-500">曜日・時限</span><button type="button" className="rounded-full px-2 py-1 text-xs font-bold text-blue-500 disabled:text-[#c7c7cc]" disabled={periods.length === 0} onClick={handleAddSlot}>追加</button></div><div className="grid gap-2">{slots.map((slot, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"><select className="h-9 rounded-xl border px-2 text-xs font-bold" value={slot.dayIndex} onChange={(event) => {
                const nextDayIndex = Number(event.target.value); if (isValidCalendarTimetableWeekdayIndex(nextDayIndex)) handleUpdateSlot(index, { ...slot, dayIndex: nextDayIndex }); }} aria-label="曜日"
              >{TIMETABLE_DAY_LABELS.map((label, dayIndex) => <option key={label} value={dayIndex}>{label}</option>)}</select><select className="h-9 rounded-xl border px-2 text-xs font-bold" value={slot.periodLabel} onChange={(event) => handleUpdateSlot(index, { ...slot, periodLabel: event.target.value })} aria-label="時限">{periods.map((period) => <option key={period.id} value={period.label}>{period.label}限</option>)}</select><button type="button" className="rounded-full px-2 text-xs font-bold text-[#ff3b30]" onClick={() => handleDeleteSlot(index)}>削除</button></div>)}</div></>
              <button type="button" className="h-10 rounded-full bg-[#007aff] px-4 text-xs font-bold text-white disabled:bg-[#c7c7cc]" disabled={!canSave} onClick={handleSave}>授業DBに登録</button>
            </div>
          </div>
          <div className="flex min-h-0 flex-col overflow-hidden px-5 py-4">
            <div className="mb-3 flex gap-2"><input className="h-10 min-w-0 flex-1 rounded-xl border px-3 text-xs font-semibold" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch(); }} placeholder="大学名・学部・授業名・教員で検索"
            /><button type="button" className="h-10 rounded-full border px-4 text-xs font-bold text-blue-500" onClick={handleSearch}>検索</button></div>
            <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-2">{results.map((course) => <div key={course.id} className="rounded-2xl border border-slate-200 bg-[#fafafa] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold text-zinc-900">{course.title}</div><div className="mt-1 truncate text-xs font-semibold text-zinc-500">{course.institutionName} / {course.facultyName}{course.facultyName && course.departmentName ? "・" : ""}{course.departmentName}</div><div className="mt-1 truncate text-xs font-medium text-zinc-500">{course.teacher ?? "教員未設定"} / {course.room ?? "教室未設定"} / {getSyllabusCourseSlotsLabel(course)}</div></div><button type="button" className="shrink-0 rounded-full bg-[#007aff] px-3 py-1.5 text-xs font-bold text-white" onClick={() => handleAddCourse(course)}>追加</button></div>{course.memo ? <div className="mt-2 line-clamp-2 text-xs font-medium text-zinc-500">{course.memo}</div> : null}</div>)}</div>{results.length === 0 ? <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-xs font-semibold text-zinc-500">授業DBは空です。</div> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CalendarTimetableSyllabusCatalogDialog };
