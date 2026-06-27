import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { SharedCardAttachments } from "./SharedCardAttachments";
import type { CardFaceAttachments } from "@/types/domain/card";



type CardFaceWithAttachmentsProps = Readonly<{
  faceNode: React.ReactNode;
  attachments?: CardFaceAttachments | null;
  className?: string;
}>;



const CardFaceWithAttachments = ({ faceNode, attachments, className }: CardFaceWithAttachmentsProps) => {
  return (<div className={cn("w-full min-w-0", className)}> {faceNode} <SharedCardAttachments attachments={attachments} /> </div>);
};



export { CardFaceWithAttachments };
