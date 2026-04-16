import { SharedCardAttachments } from "@/components/card/common/SharedCardAttachments";
import { cn } from "@/lib/utils";
import type { CardFaceAttachments } from "@/types/domain/card";
import React from "react";

type CardFaceWithAttachmentsProps = Readonly<{
  faceNode: React.ReactNode;
  attachments?: CardFaceAttachments | null;
  className?: string;
}>;

export const CardFaceWithAttachments = ({
  faceNode,
  attachments,
  className,
}: CardFaceWithAttachmentsProps) => {
  return (
    <div className={cn("w-full min-w-0", className)}>
      {faceNode}
      <SharedCardAttachments attachments={attachments} />
    </div>
  );
};
