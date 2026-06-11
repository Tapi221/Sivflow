import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import { forwardRef } from "react";
import * as stratisIcons from "stratis-ui-icons";
import { UiIcon } from "./UiIcon";









export type IconProps = SVGProps<SVGSVGElement> & { size?: number;
  label?: string;
  title?: string;
};
type StratisIconComponent = ForwardRefExoticComponent<SVGProps<SVGSVGElement> & RefAttributes<SVGSVGElement>>;
type StratisDataIcon = {
  data: string;
};
type StratisIconExport = StratisDataIcon | StratisIconComponent;
type GlyphKind = "alert-circle" | "alert-triangle" | "arrow-left" | "arrow-right" | "arrow-up-down" | "calendar" | "check" | "chevron-down" | "chevron-left" | "chevron-right" | "chevron-up" | "circle" | "clock" | "code" | "copy" | "download" | "edit" | "external-link" | "file-edit" | "filter" | "globe" | "help" | "image" | "info" | "keyboard" | "link" | "logout" | "minus" | "pin" | "plus" | "refresh" | "search" | "settings" | "shield" | "star" | "tag" | "trash" | "type" | "user" | "volume" | "wrench" | "x" | "default";









const stratisIconRegistry = stratisIcons as unknown as Record<string, StratisIconExport | undefined>;
const svgTextEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
const glyphPaths: Record<GlyphKind, string[]> = {
  "alert-circle": ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M12 8v5", "M12 16h.01"],
  "alert-triangle": ["M10.3 4.2 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z", "M12 9v4", "M12 17h.01"],
  "arrow-left": ["M19 12H5", "m12 7-7-7 7-7"],
  "arrow-right": ["M5 12h14", "m-7-7 7 7-7 7"],
  "arrow-up-down": ["M12 5v14", "m-4 4 4-4 4 4", "m-8 6 4 4 4-4"],
  calendar: ["M7 3v4", "M17 3v4", "M4 8h16", "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"],
  check: ["m5 12 5 5L20 7"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  circle: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  clock: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M12 8v5l3 2"],
  code: ["m8 9-4 3 4 3", "m16 9 4 3-4 3", "m14 5-4 14"],
  copy: ["M9 9h10v10H9z", "M5 15H4V5h10v1"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  edit: ["M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z", "M14 7l3 3"],
  "external-link": ["M14 4h6v6", "M20 4 10 14", "M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"],
  "file-edit": ["M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z", "M14 2v5h5", "M9 18l1-4 4-4 3 3-4 4-4 1Z"],
  filter: ["M4 5h16", "M7 12h10", "M10 19h4"],
  globe: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M4 12h16", "M12 4a12 12 0 0 1 0 16", "M12 4a12 12 0 0 0 0 16"],
  help: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M9.8 9a2.4 2.4 0 0 1 4.6 1.2c0 1.8-2.4 2-2.4 3.8", "M12 17h.01"],
  image: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z", "m21 15-5-5L5 21"],
  info: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M12 11v5", "M12 8h.01"],
  keyboard: ["M4 7h16v10H4z", "M7 10h.01", "M10 10h.01", "M13 10h.01", "M16 10h.01", "M8 14h8"],
  link: ["M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2", "M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M21 4v16"],
  minus: ["M5 12h14"],
  pin: ["M12 17v5", "M5 7h14", "M7 7l2-4h6l2 4", "M8 7v6l-2 4h12l-2-4V7"],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: ["M20 6v6h-6", "M4 18v-6h6", "M19 12a7 7 0 0 0-12-5", "M5 12a7 7 0 0 0 12 5"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20 20-3.5-3.5"],
  settings: ["M4 7h5", "M13 7h7", "M11 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M4 17h7", "M15 17h5", "M13 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"],
  star: ["m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20l1-6.1L3.2 9.6l6.1-.9L12 3Z"],
  tag: ["M20 12 12 20 4 12V4h8l8 8Z", "M8 8h.01"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  type: ["M4 6V4h16v2", "M12 4v16", "M9 20h6"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  volume: ["M4 9v6h4l5 4V5L8 9H4Z", "M16 9a4 4 0 0 1 0 6", "M18.5 6.5a8 8 0 0 1 0 11"],
  wrench: ["M14.7 6.3a4 4 0 0 0 5 5L11 20H6v-5l8.7-8.7Z", "M16 4l4 4"],
  x: ["m6 6 12 12", "m18 6-12 12"],
  default: ["M6 6h12v12H6z"],
};
const glyphByIconName: Record<string, GlyphKind> = {
  AlertCircle: "alert-circle",
  AlertTriangle: "alert-triangle",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ArrowUpDown: "arrow-up-down",
  Calendar: "calendar",
  Check: "check",
  CheckCheck: "check",
  CheckCircle: "check",
  CheckCircle2: "check",
  ChevronDown: "chevron-down",
  ChevronLeft: "chevron-left",
  ChevronRight: "chevron-right",
  ChevronUp: "chevron-up",
  Circle: "circle",
  Clock: "clock",
  Code: "code",
  Construction: "wrench",
  Copy: "copy",
  Download: "download",
  Edit: "edit",
  ExternalLink: "external-link",
  FileEdit: "file-edit",
  Filter: "filter",
  Globe: "globe",
  HelpCircle: "help",
  History: "clock",
  Image: "image",
  Info: "info",
  Keyboard: "keyboard",
  Link: "link",
  LogOut: "logout",
  Minus: "minus",
  Pin: "pin",
  Plus: "plus",
  RefreshCw: "refresh",
  Search: "search",
  SearchX: "search",
  Settings2: "settings",
  Shield: "shield",
  Star: "star",
  Tag: "tag",
  Trash2: "trash",
  Type: "type",
  User: "user",
  Volume2: "volume",
  X: "x",
  XCircle: "x",
};









const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isStratisDataIcon = (value: unknown): value is StratisDataIcon => isRecord(value) && typeof value.data === "string";
const isStratisIconComponent = (value: unknown): value is StratisIconComponent => typeof value === "function" || (isRecord(value) && "$$typeof" in value);
const escapeSvgText = (value: string): string => value.replace(/[&<>"']/g, (char) => svgTextEscapes[char] ?? char);
const getStratisSvgViewBox = (source: string): string => source.match(/\sviewBox="([^"]+)"/)?.[1] ?? "0 0 24 24";
const normalizeStratisSvgBody = (source: string): string => source.replace(/^[\s\S]*?<svg\b[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").replace(/\s(width|height)="[^"]*"/g, "").replace(/\sstroke="(?!none|currentColor)[^"]*"/g, " stroke=\"currentColor\"").replace(/\sfill="(?!none|currentColor|url\()[^"]*"/g, " fill=\"currentColor\"");
const wrapStratisIcon = (BaseIcon: StratisIconComponent, name: string) => {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, className, label, title, style, strokeWidth, ...rest }, ref) => {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return <BaseIcon ref={ref} width={pixelSize} height={pixelSize} className={className} style={{ display: "block", flexShrink: 0, ...style }} role={decorative ? "presentation" : "img"} aria-label={resolvedLabel} aria-hidden={decorative ? true : undefined} {...(title ? { title } : {})} {...(strokeWidth != null ? { strokeWidth } : {})} {...rest} />;
  });

  Icon.displayName = name;
  return Icon;
};
const wrapStratisDataIcon = (source: StratisDataIcon, name: string) => {
  const viewBox = getStratisSvgViewBox(source.data);
  const body = normalizeStratisSvgBody(source.data);

  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, className, label, title, style, strokeWidth, ...rest }, ref) => {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;
    const innerHtml = title ? `<title>${escapeSvgText(title)}</title>${body}` : body;

    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} width={pixelSize} height={pixelSize} className={className} style={{ display: "block", flexShrink: 0, ...style }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" role={decorative ? "presentation" : "img"} aria-label={resolvedLabel} aria-hidden={decorative ? true : undefined} data-icon-source="stratis-ui-icons" data-icon-name={name} {...(strokeWidth != null ? { strokeWidth } : {})} {...rest} dangerouslySetInnerHTML={{ __html: innerHtml }} />;
  });

  Icon.displayName = name;
  return Icon;
};
const makeIcon = (name: string) => {
  const glyph = glyphByIconName[name] ?? "default";

  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, className, label, title, style, strokeWidth = 1.5, ...rest }, ref) => {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={pixelSize} height={pixelSize} className={className} style={{ display: "block", flexShrink: 0, ...style }} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" role={decorative ? "presentation" : "img"} aria-label={resolvedLabel} aria-hidden={decorative ? true : undefined} data-icon-source="fallback" data-icon-name={name} {...rest}>
        {title ? <title>{title}</title> : null}
        {glyphPaths[glyph].map((d, index) => <path key={`${name}-${index}`} d={d} />)}
      </svg>
    );
  });

  Icon.displayName = name;
  return Icon;
};
const makeStratisIcon = (exportName: string, name: string) => {
  const candidate = stratisIconRegistry[exportName];

  if (isStratisDataIcon(candidate)) return wrapStratisDataIcon(candidate, name);
  if (isStratisIconComponent(candidate)) return wrapStratisIcon(candidate, name);
  return makeIcon(name);
};









const MoreVerticalIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, className, label, title, style, ...rest }, ref) => {
  const resolvedLabel = label ?? rest["aria-label"];
  const decorative = resolvedLabel == null;
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={pixelSize} height={pixelSize} viewBox="0 0 24 24" fill="none" stroke="none" className={className} style={style} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : resolvedLabel} role={decorative ? undefined : "img"} {...rest}>
      {title ? <title>{title}</title> : null}
      <circle cx="7" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="17" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
});
const ExplorerChevronDownIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => {
  return (
    <UiIcon ref={ref} size={size} {...props}>
      <path d="m7 10 5 5 5-5" />
    </UiIcon>
  );
});
const ExplorerChevronRightIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => {
  return (
    <UiIcon ref={ref} size={size} {...props}>
      <path d="m10 7 5 5-5 5" />
    </UiIcon>
  );
});
const ExplorerFileTextIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => {
  return (
    <UiIcon ref={ref} size={size} {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </UiIcon>
  );
});
const ExplorerFolderOpenIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => {
  return (
    <UiIcon ref={ref} size={size} {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z" />
      <path d="M3 10h18l-1.4 8.4A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-1.98-1.6z" />
    </UiIcon>
  );
});
const ExplorerFolderOutlineIcon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => {
  return (
    <UiIcon ref={ref} size={size} {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </UiIcon>
  );
});









MoreVerticalIcon.displayName = "MoreVerticalIcon";
ExplorerChevronDownIcon.displayName = "ExplorerChevronDownIcon";
ExplorerChevronRightIcon.displayName = "ExplorerChevronRightIcon";
ExplorerFileTextIcon.displayName = "ExplorerFileTextIcon";
ExplorerFolderOpenIcon.displayName = "ExplorerFolderOpenIcon";
ExplorerFolderOutlineIcon.displayName = "ExplorerFolderOutlineIcon";









export const AlertCircle = makeStratisIcon("suIconAlertCircle", "AlertCircle");
export const AlertTriangle = makeStratisIcon("suIconAlertTriangle", "AlertTriangle");
export const ArrowLeft = makeStratisIcon("suIconArrowLeftSquareContained", "ArrowLeft");
export const ArrowRight = makeStratisIcon("suIconArrowRightSquareContained", "ArrowRight");
export const ArrowUpDown = makeStratisIcon("suIconArrowSwitchHorizontal", "ArrowUpDown");
export const BookOpen = makeIcon("BookOpen");
export const Brain = makeIcon("Brain");
export const Calendar = makeStratisIcon("suIconCalendarNumber", "Calendar");
export const Camera = makeIcon("Camera");
export const Check = makeIcon("Check");
export const CheckCheck = makeIcon("CheckCheck");
export const CheckCircle = makeIcon("CheckCircle");
export const CheckCircle2 = makeIcon("CheckCircle2");
export const ChevronDown = ExplorerChevronDownIcon;
export const ChevronLeft = makeStratisIcon("suIconChevronLeft", "ChevronLeft");
export const ChevronRight = ExplorerChevronRightIcon;
export const ChevronUp = makeStratisIcon("suIconChevronUp", "ChevronUp");
export const Circle = makeIcon("Circle");
export const Clock = makeStratisIcon("suIconClock01", "Clock");
export const Cloud = makeIcon("Cloud");
export const CloudOff = makeIcon("CloudOff");
export const Construction = makeStratisIcon("suIconWrench", "Construction");
export const Copy = makeStratisIcon("suIconCopyLeft", "Copy");
export const Database = makeIcon("Database");
export const Download = makeIcon("Download");
export const Edit = makeStratisIcon("suIconEditContained", "Edit");
export const Eraser = makeIcon("Eraser");
export const ExternalLink = makeStratisIcon("suIconLinkExternal", "ExternalLink");
export const FileAudio = makeIcon("FileAudio");
export const FileEdit = makeStratisIcon("suIconFileEdit02", "FileEdit");
export const FileJson = makeIcon("FileJson");
export const FileText = ExplorerFileTextIcon;
export const FileWarning = makeIcon("FileWarning");
export const FileX = makeIcon("FileX");
export const Filter = makeStratisIcon("suIconFilter", "Filter");
export const Flame = makeIcon("Flame");
export const Folder = ExplorerFolderOpenIcon;
export const FolderInput = makeIcon("FolderInput");
export const FolderTree = makeIcon("FolderTree");
export const GitMerge = makeIcon("GitMerge");
export const Globe = makeStratisIcon("suIconGlobe02", "Globe");
export const GripVertical = makeIcon("GripVertical");
export const HardDrive = makeIcon("HardDrive");
export const HelpCircle = makeStratisIcon("suIconHelpCircleContained", "HelpCircle");
export const History = makeStratisIcon("suIconClockBackward", "History");
export const Image = makeStratisIcon("suIconImage", "Image");
export const Info = makeStratisIcon("suIconInfoSquare01Contained", "Info");
export const Keyboard = makeStratisIcon("suIconKeyboard", "Keyboard");
export const Layers = makeIcon("Layers");
export const Link = makeStratisIcon("suIconLinkAngled", "Link");
export const List = makeIcon("List");
export const Loader2 = makeIcon("Loader2");
export const LogOut = makeStratisIcon("suIconLogout01", "LogOut");
export const Merge = makeIcon("Merge");
export const MessageSquare = makeIcon("MessageSquare");
export const Minus = makeIcon("Minus");
export const MoreVertical = MoreVerticalIcon;
export const Move = makeIcon("Move");
export const Palette = makeIcon("Palette");
export const Pause = makeIcon("Pause");
export const PenLine = makeIcon("PenLine");
export const Pencil = makeIcon("Pencil");
export const Pin = makeIcon("Pin");
export const Play = makeIcon("Play");
export const Plus = makeStratisIcon("suIconPlus01", "Plus");
export const Redo2 = makeIcon("Redo2");
export const RefreshCw = makeStratisIcon("suIconArrowRefresh01", "RefreshCw");
export const RotateCcw = makeIcon("RotateCcw");
export const Search = makeStratisIcon("suIconSearch01", "Search");
export const SearchX = makeStratisIcon("suIconFolderSearch01", "SearchX");
export const Settings2 = makeIcon("Settings2");
export const Shield = makeIcon("Shield");
export const Smartphone = makeIcon("Smartphone");
export const Sparkles = makeIcon("Sparkles");
const SigmaIcon = makeIcon("SigmaIcon");
export const Star = makeStratisIcon("suIconStar02", "Star");
export const Tag = makeStratisIcon("suIconTag", "Tag");
const NotebookPenIcon = makeIcon("NotebookPenIcon");
export const Trash2 = makeStratisIcon("suIconTrash03", "Trash2");
export const Trophy = makeIcon("Trophy");
export const Type = makeStratisIcon("suIconType03", "Type");
export const Undo2 = makeIcon("Undo2");
export const Upload = makeIcon("Upload");
export const User = makeIcon("User");
export const Volume2 = makeStratisIcon("suIconAudioSettings01", "Volume2");
export const X = makeStratisIcon("suIconX01", "X");
export const XCircle = makeStratisIcon("suIconXCircleContained", "XCircle");
export const Zap = makeIcon("Zap");
export const Code = makeStratisIcon("suIconCode01", "Code");
export const FolderIcon = Folder;
export const FolderOutlineIcon = ExplorerFolderOutlineIcon;
export const ImageIcon = Image;
export const CircleHelp = HelpCircle;
export const Sigma = SigmaIcon;
export const NotebookPen = NotebookPenIcon;
