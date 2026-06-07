import { forwardRef, memo, type ReactNode, type Ref } from "react";

type P={children:ReactNode;className?:string};
type S=P&{toolbar?:ReactNode;overlay?:ReactNode;leftPanel?:ReactNode;isLeftPanelCollapsed?:boolean;reserveToolbar?:boolean;reserveLeftPanel?:boolean;viewportRef?:Ref<HTMLDivElement>;bodyClassName?:string;viewportClassName?:string};

const side="w-[232px] shrink-0";

const CarvePanelViewport