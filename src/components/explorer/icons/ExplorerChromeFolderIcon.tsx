import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ExplorerChromeFolderIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const FOLDER_TAB_PATH = "M3.1 5.2C3.1 4.1 4 3.2 5.1 3.2H8.1C8.7 3.2 9.2 3.5 9.6 4L10.6 5.3H15C16.1 5.3 17 6.2 17 7.3V7.8H3.1V5.2Z";
const FOLDER_BODY_PATH = "M3 7.1H17.1C17.8 7.1 18.3 7.7 18.2 8.4L16.9 15.2C16.7 16.2 15.9 16.8 14.9 16.8H5.1C4.1 16.8 3