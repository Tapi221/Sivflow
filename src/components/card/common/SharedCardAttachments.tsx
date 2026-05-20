import React from "react";

import { sanitizeReferences } from "@/components/card/editor/cardEditorUtils";
import { AudioPlayer } from "@/components/card/media/CardMedia";

import { cn } from "@/lib/utils";
import type { ReferenceBlockData } from "@/types/domain/base";
import type { CardFaceAttachments } from "@/types/domain/card";

type SharedCardAttachmentsProps = Readonly<{
  attachments?: CardFaceAttachments | null;
  className?: string;
}>;

const normalizeAudioUrls = (
  attachments?: CardFaceAttachments | null,
): string[] =>
  (attachments?.audios ?? [])
    .map((item) => item?.url?.trim() ?? "")
    .filter((item): item is string => item.length > 0);

const normalizeReferences = (
  attachments?: CardFaceAttachments | null,
): ReferenceBlockData[] => sanitizeReferences(attachments?.references ?? []);

export const SharedCardAttachments = ({
  attachments,
  className,
}: SharedCardAttachmentsProps) => {
  const audioUrls = React.useMemo(
    () => normalizeAudioUrls(attachments),
    [attachments],
  );
  const references = React.useMemo(
    () => normalizeReferences(attachments),
    [attachments],
  );

  if (audioUrls.length === 0 && references.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex w-full flex-col gap-3 px-2 pt-3", className)}
      data-card-attachments="true"
      data-card-no-flip="true"
    >
      {audioUrls.length > 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 shadow-sm">
          <AudioPlayer urls={audioUrls} />
        </div>
      ) : null}

      {references.length > 0 ? (
        <section className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 shadow-sm">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">
            References
          </div>
          <ul className="space-y-1.5">
            {references.map((reference, index) => {
              const href = reference.url?.trim() ?? "";
              const label = reference.name?.trim() || href;

              return (
                <li key={`${href}-${index}`} className="min-w-0">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm text-sky-700 underline underline-offset-2 hover:text-sky-800"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="block truncate text-sm text-slate-600">
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
