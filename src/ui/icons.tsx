import { forwardRef } from "react";
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import { UiIcon } from "./UiIcon";
import {
  StratisAlertCircleIcon,
  StratisAlertTriangleIcon,
  StratisArrowLeftSquareContainedIcon,
  StratisArrowRefresh01Icon,
  StratisArrowRightSquareContainedIcon,
  StratisArrowSwitchHorizontalIcon,
  StratisCalendarNumberIcon,
  StratisChevronLeftIcon,
  StratisChevronUpIcon,
  StratisClock01Icon,
  StratisClockBackwardIcon,
  StratisCode01Icon,
  StratisCopyLeftIcon,
  StratisEditContainedIcon,
  StratisFileEdit02Icon,
  StratisFilterIcon,
  StratisFormulaIcon,
  StratisFolderSearch01Icon,
  StratisGlobe02Icon,
  StratisHelpCircleContainedIcon,
  StratisImageIcon,
  StratisMarkdownIcon,
  StratisInfoSquare01ContainedIcon,
  StratisLinkAngledIcon,
  StratisLinkExternalIcon,
  StratisLogout01Icon,
  StratisPlus01Icon,
  StratisSearch01Icon,
  StratisStar02Icon,
  StratisTagIcon,
  StratisTrash03Icon,
  StratisType03Icon,
  StratisWrenchIcon,
  StratisAudioSettings01Icon,
  StratisX01Icon,
  StratisXCircleContainedIcon,
} from "./icons/stratis";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  label?: string;
  title?: string;
};

type StratisIconComponent = ForwardRefExoticComponent<
  SVGProps<SVGSVGElement> & RefAttributes<SVGSVGElement>
>;

type GlyphKind =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-down"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "circle"
  | "copy"
  | "minus"
  | "plus"
  | "search"
  | "x"
  | "default";

const glyphPaths: Record<GlyphKind, string[]> = {
  "arrow-left": ["M19 12H5", "m12 7-7-7 7-7"],
  "arrow-right": ["M5 12h14", "m-7-7 7 7-7 7"],
  "arrow-up-down": ["M12 5v14", "m-4 4 4-4 4 4", "m-8 6 4 4 4-4"],
  check: ["m5 12 5 5L20 7"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  circle: ["M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"],
  copy: ["M9 9h10v10H9z", "M5 15H4V5h10v1"],
  minus: ["M5 12h14"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20 20-3.5-3.5"],
  x: ["m6 6 12 12", "m18 6-12 12"],
  default: ["M6 6h12v12H6z"],
};

const glyphByIconName: Record<string, GlyphKind> = {
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ArrowUpDown: "arrow-up-down",
  Check: "check",
  CheckCheck: "check",
  CheckCircle: "check",
  CheckCircle2: "check",
  ChevronDown: "chevron-down",
  ChevronLeft: "chevron-left",
  ChevronRight: "chevron-right",
  ChevronUp: "chevron-up",
  Circle: "circle",
  Copy: "copy",
  Minus: "minus",
  Plus: "plus",
  Search: "search",
  SearchX: "search",
  X: "x",
  XCircle: "x",
};

const wrapStratisIcon = (BaseIcon: StratisIconComponent, name: string) => {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function WrappedStratisIcon(
    { size = 16, className, label, title, style, strokeWidth, ...rest },
    ref,
  ) {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return (
      <BaseIcon
        ref={ref}
        width={pixelSize}
        height={pixelSize}
        className={className}
        style={{ display: "block", flexShrink: 0, ...style }}
        role={decorative ? "presentation" : "img"}
        aria-label={resolvedLabel}
        aria-hidden={decorative ? true : undefined}
        {...(title ? { title } : {})}
        {...(strokeWidth != null ? { strokeWidth } : {})}
        {...rest}
      />
    );
  });

  Icon.displayName = name;
  return Icon;
};

const makeIcon = (name: string) => {
  const glyph = glyphByIconName[name] ?? "default";

  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 16, className, label, title, style, strokeWidth = 1.8, ...rest },
    ref,
  ) {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={pixelSize}
        height={pixelSize}
        className={className}
        style={{ display: "block", flexShrink: 0, ...style }}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={decorative ? "presentation" : "img"}
        aria-label={resolvedLabel}
        aria-hidden={decorative ? true : undefined}
        data-icon-source="fallback"
        data-icon-name={name}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {glyphPaths[glyph].map((d, index) => (
          <path key={`${name}-${index}`} d={d} />
        ))}
      </svg>
    );
  });

  Icon.displayName = name;
  return Icon;
};

const MoreVerticalIcon = forwardRef<SVGSVGElement, IconProps>(
  function MoreVerticalIcon(
    { size = 16, className, label, title, style, ...rest },
    ref,
  ) {
    const resolvedLabel = label ?? rest["aria-label"];
    const decorative = resolvedLabel == null;
    const pixelSize = typeof size === "number" ? `${size}px` : size;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
        className={className}
        style={style}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : resolvedLabel}
        role={decorative ? undefined : "img"}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        <circle cx="7" cy="12" r="1.35" fill="currentColor" />
        <circle cx="12" cy="12" r="1.35" fill="currentColor" />
        <circle cx="17" cy="12" r="1.35" fill="currentColor" />
      </svg>
    );
  },
);

const ExplorerChevronDownIcon = forwardRef<SVGSVGElement, IconProps>(
  function ExplorerChevronDownIcon({ size = 16, ...props }, ref) {
    return (
      <UiIcon ref={ref} size={size} {...props}>
        <path d="m7 10 5 5 5-5" />
      </UiIcon>
    );
  },
);

const ExplorerChevronRightIcon = forwardRef<SVGSVGElement, IconProps>(
  function ExplorerChevronRightIcon({ size = 16, ...props }, ref) {
    return (
      <UiIcon ref={ref} size={size} {...props}>
        <path d="m10 7 5 5-5 5" />
      </UiIcon>
    );
  },
);

const ExplorerFileTextIcon = forwardRef<SVGSVGElement, IconProps>(
  function ExplorerFileTextIcon({ size = 16, ...props }, ref) {
    return (
      <UiIcon ref={ref} size={size} {...props}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </UiIcon>
    );
  },
);

const ExplorerFolderOpenIcon = forwardRef<SVGSVGElement, IconProps>(
  function ExplorerFolderOpenIcon({ size = 16, ...props }, ref) {
    return (
      <UiIcon ref={ref} size={size} {...props}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z" />
        <path d="M3 10h18l-1.4 8.4A2 2 0 0 1 17.6 20H6.4a2 2 0 0 1-1.98-1.6z" />
      </UiIcon>
    );
  },
);

const ExplorerFolderOutlineIcon = forwardRef<SVGSVGElement, IconProps>(
  function ExplorerFolderOutlineIcon({ size = 16, ...props }, ref) {
    return (
      <UiIcon ref={ref} size={size} {...props}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </UiIcon>
    );
  },
);

export const AlertCircle = wrapStratisIcon(
  StratisAlertCircleIcon,
  "AlertCircle",
);
export const AlertTriangle = wrapStratisIcon(
  StratisAlertTriangleIcon,
  "AlertTriangle",
);
export const ArrowLeft = wrapStratisIcon(
  StratisArrowLeftSquareContainedIcon,
  "ArrowLeft",
);
export const ArrowRight = wrapStratisIcon(
  StratisArrowRightSquareContainedIcon,
  "ArrowRight",
);
export const ArrowUpDown = wrapStratisIcon(
  StratisArrowSwitchHorizontalIcon,
  "ArrowUpDown",
);
export const BookOpen = makeIcon("BookOpen");
export const Brain = makeIcon("Brain");
export const Calendar = wrapStratisIcon(StratisCalendarNumberIcon, "Calendar");
export const Camera = makeIcon("Camera");
export const Check = makeIcon("Check");
export const CheckCheck = makeIcon("CheckCheck");
export const CheckCircle = makeIcon("CheckCircle");
export const CheckCircle2 = makeIcon("CheckCircle2");
export const ChevronDown = ExplorerChevronDownIcon;
export const ChevronLeft = wrapStratisIcon(
  StratisChevronLeftIcon,
  "ChevronLeft",
);
export const ChevronRight = ExplorerChevronRightIcon;
export const ChevronUp = wrapStratisIcon(StratisChevronUpIcon, "ChevronUp");
export const Circle = makeIcon("Circle");
export const Clock = wrapStratisIcon(StratisClock01Icon, "Clock");
export const Cloud = makeIcon("Cloud");
export const CloudOff = makeIcon("CloudOff");
export const Construction = wrapStratisIcon(StratisWrenchIcon, "Construction");
export const Copy = wrapStratisIcon(StratisCopyLeftIcon, "Copy");
export const Database = makeIcon("Database");
export const Download = makeIcon("Download");
export const Edit = wrapStratisIcon(StratisEditContainedIcon, "Edit");
export const Eraser = makeIcon("Eraser");
export const ExternalLink = wrapStratisIcon(
  StratisLinkExternalIcon,
  "ExternalLink",
);
export const FileAudio = makeIcon("FileAudio");
export const FileEdit = wrapStratisIcon(StratisFileEdit02Icon, "FileEdit");
export const FileJson = makeIcon("FileJson");
export const FileText = ExplorerFileTextIcon;
export const FileWarning = makeIcon("FileWarning");
export const FileX = makeIcon("FileX");
export const Filter = wrapStratisIcon(StratisFilterIcon, "Filter");
export const Flame = makeIcon("Flame");
export const Folder = ExplorerFolderOpenIcon;
export const FolderInput = makeIcon("FolderInput");
export const FolderTree = makeIcon("FolderTree");
export const GitMerge = makeIcon("GitMerge");
export const Globe = wrapStratisIcon(StratisGlobe02Icon, "Globe");
export const GripVertical = makeIcon("GripVertical");
export const HardDrive = makeIcon("HardDrive");
export const HelpCircle = wrapStratisIcon(
  StratisHelpCircleContainedIcon,
  "HelpCircle",
);
export const History = wrapStratisIcon(StratisClockBackwardIcon, "History");
export const Image = wrapStratisIcon(StratisImageIcon, "Image");
export const Info = wrapStratisIcon(StratisInfoSquare01ContainedIcon, "Info");
export const Keyboard = makeIcon("Keyboard");
export const Layers = makeIcon("Layers");
export const Link = wrapStratisIcon(StratisLinkAngledIcon, "Link");
export const List = makeIcon("List");
export const Loader2 = makeIcon("Loader2");
export const LogOut = wrapStratisIcon(StratisLogout01Icon, "LogOut");
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
export const Plus = wrapStratisIcon(StratisPlus01Icon, "Plus");
export const Redo2 = makeIcon("Redo2");
export const RefreshCw = wrapStratisIcon(
  StratisArrowRefresh01Icon,
  "RefreshCw",
);
export const RotateCcw = makeIcon("RotateCcw");
export const Search = wrapStratisIcon(StratisSearch01Icon, "Search");
export const SearchX = wrapStratisIcon(StratisFolderSearch01Icon, "SearchX");
export const Settings2 = makeIcon("Settings2");
export const Shield = makeIcon("Shield");
export const Smartphone = makeIcon("Smartphone");
export const Sparkles = makeIcon("Sparkles");
const SigmaIcon = makeIcon("SigmaIcon");
export const Star = wrapStratisIcon(StratisStar02Icon, "Star");
export const Tag = wrapStratisIcon(StratisTagIcon, "Tag");
const NotebookPenIcon = makeIcon("NotebookPenIcon");
export const Trash2 = wrapStratisIcon(StratisTrash03Icon, "Trash2");
export const Trophy = makeIcon("Trophy");
export const Type = wrapStratisIcon(StratisType03Icon, "Type");
export const Undo2 = makeIcon("Undo2");
export const Upload = makeIcon("Upload");
export const User = makeIcon("User");
export const Volume2 = wrapStratisIcon(StratisAudioSettings01Icon, "Volume2");
export const X = wrapStratisIcon(StratisX01Icon, "X");
export const XCircle = wrapStratisIcon(StratisXCircleContainedIcon, "XCircle");
export const Zap = makeIcon("Zap");
export const Code = wrapStratisIcon(StratisCode01Icon, "Code");
export const FolderIcon = Folder;
export const FolderOutlineIcon = ExplorerFolderOutlineIcon;
export const ImageIcon = Image;
export const CircleHelp = HelpCircle;
export const Sigma = SigmaIcon;
export const NotebookPen = NotebookPenIcon;
export { StratisFormulaIcon, StratisMarkdownIcon };
