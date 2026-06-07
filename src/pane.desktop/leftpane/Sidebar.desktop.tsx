import { type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, GalleryIcon, HomeIcon, SettingIcon, SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { useAuthSession } from "@/contexts/auth