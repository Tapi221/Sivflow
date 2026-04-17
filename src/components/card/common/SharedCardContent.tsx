import { cn } from "@/lib/utils";
import { CONTENT_TYPO } from "@/styles/tokens/typography";
import React from "react";
import { SharedCardEditScene } from "./SharedCardEditScene";
import type { SharedCardContentProps } from "./SharedCardContent.types";
import { SharedCardViewScene } from "./SharedCardViewScene";
import { CARD_CONTENT_TOP_PX } from "@constants/shared/flashcard";

const SHARED_CARD_CONTENT_ROOT_CLASS_NAME =
  "card-content-root flex min-h-0 flex-1 w-full max-w-full flex-col overflow-x-clip overflow-y-visible";

type SharedCardContentRootProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

const SharedCardContentRoot = React.memo(
  ({ className, children }: SharedCardContentRootProps) => (
    <div
      className={cn(
        SHARED_CARD_CONTENT_ROOT_CLASS_NAME,
        CONTENT_TYPO,
        className,
      )}
      style={{
        paddingTop: `var(--card-content-padding-top, ${CARD_CONTENT_TOP_PX}px)`,
      }}
    >
      {children}
    </div>
  ),
);

SharedCardContentRoot.displayName = "SharedCardContentRoot";

const SharedCardContentScene = React.memo((props: SharedCardContentProps) => {
  return props.mode === "view" ? (
    <SharedCardViewScene {...props} />
  ) : (
    <SharedCardEditScene {...props} />
  );
});

SharedCardContentScene.displayName = "SharedCardContentScene";

const SharedCardContentInner = (props: SharedCardContentProps) => {
  return (
    <SharedCardContentRoot className={props.className}>
      <SharedCardContentScene {...props} />
    </SharedCardContentRoot>
  );
};

export const SharedCardContent = React.memo(SharedCardContentInner);
SharedCardContent.displayName = "SharedCardContent";

export type { SharedCardContentProps } from "./SharedCardContent.types";
