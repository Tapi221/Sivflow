import React from "react";
import { CONTENT_TYPO } from "@shared/design-tokens/Typography";
import { cn } from "@web-renderer/lib/utils";
import type { SharedCardContentProps } from "./SharedCardContent.types";
import { SharedCardEditScene } from "./SharedCardEditScene";
import { SharedCardViewScene } from "./SharedCardViewScene";
import { CARD_CONTENT_TOP_PX } from "@/domain/card/cardGeometry.constants";



type SharedCardContentRootProps = Readonly<{
  className?: string;
  isTextSelectable?: boolean;
  children: React.ReactNode;
}>;



const SHARED_CARD_CONTENT_ROOT_CLASS_NAME =
  "card-content-root flex min-h-0 flex-1 w-full max-w-full flex-col overflow-x-clip overflow-y-visible";



const SharedCardContentRootComponent = ({
  className,
  isTextSelectable = false,
  children,
}: SharedCardContentRootProps) => (
  <div
    className={cn(
      SHARED_CARD_CONTENT_ROOT_CLASS_NAME,
      CONTENT_TYPO,
      className,
    )}
    data-card-text-selectable={isTextSelectable ? "true" : undefined}
    style={{
      paddingTop: `var(--card-content-padding-top, ${CARD_CONTENT_TOP_PX}px)`,
    }}
  >
    {children}
  </div>
);
const SharedCardContentSceneComponent = (props: SharedCardContentProps) => {
  return props.mode === "view" ? (
    <SharedCardViewScene {...props} />
  ) : (
    <SharedCardEditScene {...props} />
  );
};
const SharedCardContentInner = (props: SharedCardContentProps) => {
  return (
    <SharedCardContentRoot
      className={props.className}
      isTextSelectable={props.mode === "view"}
    >
      <SharedCardContentScene {...props} />
    </SharedCardContentRoot>
  );
};



const SharedCardContentRoot = React.memo(SharedCardContentRootComponent);
const SharedCardContentScene = React.memo(SharedCardContentSceneComponent);
const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContentRoot.displayName = "SharedCardContentRoot";
SharedCardContentScene.displayName = "SharedCardContentScene";
SharedCardContent.displayName = "SharedCardContent";

export { SharedCardContent };


export type { SharedCardContentProps };
