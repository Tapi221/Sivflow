import React from "react";
import { buildTypographyStyle, mergeStyles, normalizeCardSetViewZoom } from "@web-renderer/components/card/common/cardSetViewZoom";
import { cn } from "@web-renderer/lib/utils";
import { BlockInset } from "@/components/card/blocks/editor/BlockInset";



type DivDataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};
type DivContainerProps = React.HTMLAttributes<HTMLDivElement> &
  DivDataAttributes;
type QuestionBlockLayoutProps = {
  questionContent: React.ReactNode;
  answerContent: React.ReactNode;
  className?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  containerProps?: DivContainerProps;
  answerContainerProps?: DivContainerProps;
  answerOverlay?: React.ReactNode;
  zoom?: number;
};



const scaleSpacePx = (basePx: number, zoom?: number) => {
  const resolvedZoom = normalizeCardSetViewZoom(zoom);
  return `${Number((basePx * resolvedZoom).toFixed(3))}px`;
};



const QuestionBlockLayout = ({ questionContent, answerContent, className, containerRef, containerProps, answerContainerProps, answerOverlay, zoom }: QuestionBlockLayoutProps) => {
  const labelStyle = React.useMemo(() => mergeStyles(buildTypographyStyle({ fontSizePx: 10, lineHeightPx: 10, zoom }), { marginTop: scaleSpacePx(2, zoom) }), [zoom]);

  const containerStyle = React.useMemo(
    () =>
      mergeStyles(containerProps?.style, {
        paddingLeft: scaleSpacePx(6, zoom),
        paddingRight: scaleSpacePx(4, zoom),
        paddingTop: scaleSpacePx(4, zoom),
        paddingBottom: scaleSpacePx(4, zoom),
      }),
    [containerProps?.style, zoom],
  );

  const questionRowStyle = React.useMemo(
    () =>
      mergeStyles({
        columnGap: scaleSpacePx(4, zoom),
        marginBottom: scaleSpacePx(4, zoom),
      }),
    [zoom],
  );

  const answerRowStyle = React.useMemo(
    () =>
      mergeStyles(answerContainerProps?.style, {
        columnGap: scaleSpacePx(4, zoom),
        paddingTop: scaleSpacePx(4, zoom),
      }),
    [answerContainerProps?.style, zoom],
  );

  const mergedContainerProps = React.useMemo<DivContainerProps>(
    () => ({
      ...containerProps,
      style: containerStyle,
    }),
    [containerProps, containerStyle],
  );

  const mergedAnswerContainerProps = React.useMemo<DivContainerProps>(
    () => ({
      ...answerContainerProps,
      style: answerRowStyle,
    }),
    [answerContainerProps, answerRowStyle],
  );

  return (
    <BlockInset variant="question">
      <div
        ref={containerRef}
        className={cn(
          "rounded-r-md border-l-2 border-amber-400 bg-amber-50",
          className,
        )}
        {...mergedContainerProps}
      >
        <div className="flex items-start" style={questionRowStyle}>
          <span
            className="shrink-0 font-bold text-amber-500"
            style={labelStyle}
          >
            Q.
          </span>
          {questionContent}
        </div>
        <div
          className="flex items-start border-t border-amber-200/60"
          {...mergedAnswerContainerProps}
        >
          <span
            className="shrink-0 font-bold text-slate-400"
            style={labelStyle}
          >
            A.
          </span>
          <div className="relative flex-1">
            {answerContent}
            {answerOverlay}
          </div>
        </div>
      </div>
    </BlockInset>
  );
};



export { QuestionBlockLayout };
