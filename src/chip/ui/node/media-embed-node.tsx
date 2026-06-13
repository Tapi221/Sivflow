"use client";

import * as React from "react";
import { parseTwitterUrl, parseVideoUrl } from "@platejs/media";
import { MediaEmbedPlugin, useMediaState } from "@platejs/media/react";
import { ResizableProvider, useResizableValue } from "@platejs/resizable";
import type { TMediaEmbedElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, withHOC } from "platejs/react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import { Tweet } from "react-tweet";
import { Caption, CaptionTextarea } from "@/chip/ui/plate/caption";
import { MediaToolbar } from "@/chip/ui/plate/media-toolbar";
import { mediaResizeHandleVariants, Resizable, ResizeHandle } from "@/chip/ui/plate/resize-handle";
import { cn } from "@/lib/utils";

const MediaEmbedElement = withHOC(ResizableProvider, (props: PlateElementProps<TMediaEmbedElement>) => {
  const {
    align = "center",
    embed,
    focused,
    isTweet,
    isVideo,
    isYoutube,
    readOnly,
    selected,
  } = useMediaState({
    urlParsers: [parseTwitterUrl, parseVideoUrl],
  });
  const width = useResizableValue("width");
  const provider = embed?.provider;
  return (
    <MediaToolbar plugin={MediaEmbedPlugin}>
      <PlateElement className="py-2.5" {...props}>
        <figure
          className="group relative m-0 w-full cursor-default"
          contentEditable={false}
        >
          <Resizable
            align={align}
            options={{
              align,
              maxWidth: isTweet ? 550 : "100%",
              minWidth: isTweet ? 300 : 100,
            }}
          >
            <ResizeHandle
              className={mediaResizeHandleVariants({ direction: "left" })}
              options={{ direction: "left" }}
            />
            {isVideo ? (
              isYoutube ? (
                <LiteYouTubeEmbed
                  id={embed!.id!}
                  title="youtube"
                  wrapperClass={cn(
                    "rounded-sm",
                    focused && selected && "ring-2 ring-ring ring-offset-2",
                    "relative block cursor-pointer bg-black bg-center bg-cover [contain:content]",
                    "after:block after:pb-[var(--aspect-ratio)] after:content-[\"\"]",
                  )}
                />
              ) : (
                <div
                  className={cn(
                    provider === "vimeo" && "pb-[75%]",
                    provider === "youku" && "pb-[56.25%]",
                    provider === "dailymotion" && "pb-[56.0417%]",
                    provider === "coub" && "pb-[51.25%]",
                  )}
                >
                  <iframe
                    className={cn(
                      "absolute top-0 left-0 size-full rounded-sm",
                      isVideo && "border-0",
                      focused && selected && "ring-2 ring-ring ring-offset-2",
                    )}
                    title="embed"
                    src={embed!.url}
                    allowFullScreen
                  />
                </div>
              )
            ) : null}
            {isTweet && (
              <div
                className={cn(
                  "[&_.react-tweet-theme]:my-0",
                  !readOnly &&
                    selected &&
                    "[&_.react-tweet-theme]:ring-2 [&_.react-tweet-theme]:ring-ring [&_.react-tweet-theme]:ring-offset-2",
                )}
              >
                <Tweet id={embed!.id!} />
              </div>
            )}
            <ResizeHandle
              className={mediaResizeHandleVariants({ direction: "right" })}
              options={{ direction: "right" }}
            />
          </Resizable>
          <Caption style={{ width }} align={align}>
            <CaptionTextarea placeholder="Write a caption..." />
          </Caption>
        </figure>
        {props.children}
      </PlateElement>
    </MediaToolbar>
  );
});

export { MediaEmbedElement };
