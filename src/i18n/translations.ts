import type { Locale } from "./locale.store";

export type Translations = {
  // 曜日
  weekdayLabels: string[];
  miniCalendarWeekdays: string[];

  // 月表示リサイズ
  monthRowResizeTitle: string;
  monthRowResizeAriaLabel: string;

  // 今日の復習
  todayDescriptionEmpty: string;
  todayDescriptionDue: string;

  // カレンダーサイドバー
  myCalendars: string;
  google: string;
  addGoogleCalendar: string;
  reconnectGoogleCalendar: string;
  connecting: string;

  // カレンダービュー
  taskViewComingSoon: string;
  overflowEvents: (count: number) => string;
  allDay: string;

  // ツールバー
  calendarTab: string;
  timelineTab: string;
  taskTab: string;
  searchAction: string;
  filterAction: string;
  sortAction: string;
  fieldsAction: string;

  // ビューモード
  viewMonth: string;
  viewWeek: string;
  viewDay: string;
  viewsLabel: string;

  // ナビゲーション
  todayButton: string;
  previousLabel: string;
  nextLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;

  // 設定
  settingLanguageLabel: string;
  settingLanguageTitle: string;
  langJapanese: string;
  langEnglish: string;

  // date-fns locale キー（"ja" | "en-US" 等の文字列）
  dateFnsLocaleKey: "ja" | "en-US";
};

const ja: Translations = {
  weekdayLabels: ["日", "月", "火", "水", "木", "金", "土"],
  miniCalendarWeekdays: ["S", "M", "T", "W", "T", "F", "S"],

  monthRowResizeTitle:
    "ドラッグで月表示の縦幅を変更。ダブルクリックで初期値に戻します。",
  monthRowResizeAriaLabel: "月表示の日付セルの高さを調整",

  todayDescriptionEmpty: "今日の復習はありません。",
  todayDescriptionDue: "忘れる前に復習しましょう。",

  myCalendars: "My Calendars",
  google: "Google",
  addGoogleCalendar: "Google カレンダーを追加",
  reconnectGoogleCalendar: "Google カレンダーを再接続",
  connecting: "接続中…",

  taskViewComingSoon: "タスクビューは近日公開予定",
  overflowEvents: (count) => `+${count}件`,
  allDay: "終日",

  calendarTab: "Calendar",
  timelineTab: "Timeline",
  taskTab: "Task",
  searchAction: "検索",
  filterAction: "フィルター",
  sortAction: "並び替え",
  fieldsAction: "フィールド",

  viewMonth: "月",
  viewWeek: "週",
  viewDay: "日",
  viewsLabel: "表示形式",

  todayButton: "今日",
  previousLabel: "前へ",
  nextLabel: "次へ",
  previousMonthLabel: "前の月",
  nextMonthLabel: "次の月",

  settingLanguageLabel: "言語",
  settingLanguageTitle: "言語設定",
  langJapanese: "日本語",
  langEnglish: "English",

  dateFnsLocaleKey: "ja",
};

const en: Translations = {
  weekdayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  miniCalendarWeekdays: ["S", "M", "T", "W", "T", "F", "S"],

  monthRowResizeTitle:
    "Drag to resize row height. Double-click to reset to default.",
  monthRowResizeAriaLabel: "Adjust calendar row height",

  todayDescriptionEmpty: "No reviews due today.",
  todayDescriptionDue: "Review before you forget.",

  myCalendars: "My Calendars",
  google: "Google",
  addGoogleCalendar: "Add Google Calendar",
  reconnectGoogleCalendar: "Reconnect Google Calendar",
  connecting: "Connecting…",

  taskViewComingSoon: "Task view coming soon",
  overflowEvents: (count) => `+${count} more`,
  allDay: "All day",

  calendarTab: "Calendar",
  timelineTab: "Timeline",
  taskTab: "Task",
  searchAction: "Search",
  filterAction: "Filter",
  sortAction: "Sort",
  fieldsAction: "Fields",

  viewMonth: "Month",
  viewWeek: "Week",
  viewDay: "Day",
  viewsLabel: "Views",

  todayButton: "Today",
  previousLabel: "Previous",
  nextLabel: "Next",
  previousMonthLabel: "Previous month",
  nextMonthLabel: "Next month",

  settingLanguageLabel: "Language",
  settingLanguageTitle: "Language",
  langJapanese: "日本語",
  langEnglish: "English",

  dateFnsLocaleKey: "en-US",
};

export const TRANSLATIONS: Record<Locale, Translations> = { ja, en };
