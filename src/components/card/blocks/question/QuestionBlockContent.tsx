import React, { useMemo, useState } from "react";
import { AutoResizeTextarea } from "@web-renderer/chip/ui/AutoResizeTextarea";
import { QuestionBlockLayout } from "./QuestionBlockLayout";
import { QUESTION_BLOCK_ANSWER_TEXT_CLASS, QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX, QUESTION_BLOCK_TITLE_TEXT_CLASS } from "./questionBlockTextStyles";
import { buildTypographyStyle, mergeStyles, scaleTypographyNumberPx } from "@web-renderer/components/card/common/cardSetViewZoom";



type QuestionBlockContentProps =
  | {
    mode: "view";
    questionTitle?: string;
    questionAnswer?: string;
    answerDisplayMode?: "always" | "tap_to_reveal";
    containerProps?: React.HTMLAttributes<HTMLDivElement>;
    zoom?: number;
  }
  | {
    mode: "edit";
    blockId: string;
    questionTitle?: string;
    questionAnswer?: string;
    onChangeQuestionTitle: (value: string) => void;
    onChangeQuestionAnswer: (value: string) => void;
    containerRef?: React.Ref<HTMLDivElement>;
    containerProps?: React.HTMLAttributes<HTMLDivElement>;
    onContainerFocus?: () => void;
    onContainerBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
    zoom?: number;
  };
type QuestionFieldProps =
  | Readonly<{
    mode: "view";
    value?: string;
    className: string;
    zoom?: number;
    fallbackText?: string;
  }>
  | Readonly<{
    mode: "edit";
    value?: string;
    onChange: (value: string) => void;
    className: string;
    placeholder: string;
    zoom?: number;
  }>;
type QuestionBlockViewContentProps = {
  questionTitle?: string;
  questionAnswer?: string;
  answerDisplayMode: "always" | "tap_to_reveal";
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  zoom?: number;
};



const buildQuestionFieldStyle = (zoom?: number) =>
  buildTypographyStyle({
    fontSizePx: 12,
    lineHeightPx: QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
    zoom,
  });
const resolveQuestionFieldLineHeight = (zoom?: number) =>
  scaleTypographyNumberPx(QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX, zoom);
const buildViewResetKey = ({
  questionTitle,
  questionAnswer,
  answerDisplayMode,
}: {
  questionTitle?: string;
  questionAnswer?: string;
  answerDisplayMode: "always" | "tap_to_reveal";
}) => [answerDisplayMode, questionTitle ?? "", questionAnswer ?? ""].join("::");



const QuestionField = (props: QuestionFieldProps) => {
  const style = buildQuestionFieldStyle(props.zoom);
  if (props.mode === "view") {
    const resolvedText =
      props.value && props.value.length > 0
        ? props.value
        : (props.fallbackText ?? "\u00a0");
    return (
      <p className={`flex-1 ${props.className}`} style={style}>
        {resolvedText}
      </p>
    );
  }
  return (
    <AutoResizeTextarea
      value={props.value ?? ""}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      minRows={1}
      lineHeight={resolveQuestionFieldLineHeight(props.zoom)}
      allowInternalScroll={false}
      className="flex-1"
      style={style}
      textareaClassName={`${props.className} placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0`}
    />
  );
};
const QuestionBlockViewContent = ({
  questionTitle,
  questionAnswer,
  answerDisplayMode,
  containerProps,
  zoom,
}: QuestionBlockViewContentProps) => {
  const [revealed, setRevealed] = useState(answerDisplayMode === "always");
  const answerStyle = useMemo<React.CSSProperties>(() => {
    const baseStyle = buildQuestionFieldStyle(zoom);
    if (revealed) {
      return baseStyle;
    }
    return mergeStyles(baseStyle, {
      filter: "blur(5px)",
      userSelect: "none",
      pointerEvents: "none",
    });
  }, [revealed, zoom]);
  const overlayStyle = useMemo(
    () =>
      buildTypographyStyle({
        fontSizePx: 10,
        lineHeightPx: 14,
        zoom,
      }),
    [zoom],
  );
  return (
    <QuestionBlockLayout
      containerProps={{
        ...containerProps,
        onClick: (e) => {
          containerProps?.onClick?.(e);
          e.stopPropagation();
        },
      }}
      questionContent={
        <QuestionField
          mode="view"
          value={questionTitle}
          className={QUESTION_BLOCK_TITLE_TEXT_CLASS}
          fallbackText=""
          zoom={zoom}
        />
      }
      answerContent={
        <p
          className={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} transition-all duration-200`}
          style={answerStyle}
        >
          {questionAnswer ?? "\u00a0"}
        </p>
      }
      answerContainerProps={{
        onClick: (e) => {
          e.stopPropagation();
          if (!revealed) {
            setRevealed(true);
          }
        },
        style: { cursor: revealed ? "default" : "pointer" },
      }}
      answerOverlay={
        !revealed ? (
          <span
            className="absolute inset-0 flex items-center justify-center text-slate-400"
            style={overlayStyle}
          >
            タップして表示
          </span>
        ) : undefined
      }
    />
  );
};
const QuestionBlockContent = (props: QuestionBlockContentProps) => {
  if (props.mode === "view") {
    const answerDisplayMode = props.answerDisplayMode ?? "tap_to_reveal";
    const viewResetKey = buildViewResetKey({
      questionTitle: props.questionTitle,
      questionAnswer: props.questionAnswer,
      answerDisplayMode,
    });
    return (
      <QuestionBlockViewContent
        key={viewResetKey}
        questionTitle={props.questionTitle}
        questionAnswer={props.questionAnswer}
        answerDisplayMode={answerDisplayMode}
        containerProps={props.containerProps}
        zoom={props.zoom}
      />
    );
  }
  return (
    <QuestionBlockLayout
      containerRef={props.containerRef}
      containerProps={{
        ...props.containerProps,
        onFocus: props.onContainerFocus,
        onBlur: props.onContainerBlur,
        "data-block-type": "question",
        "data-block-id": props.blockId,
      }}
      questionContent={
        <QuestionField
          mode="edit"
          value={props.questionTitle ?? ""}
          onChange={props.onChangeQuestionTitle}
          className={QUESTION_BLOCK_TITLE_TEXT_CLASS}
          placeholder="疑問・質問を入力..."
          zoom={props.zoom}
        />
      }
      answerContent={
        <QuestionField
          mode="edit"
          value={props.questionAnswer ?? ""}
          onChange={props.onChangeQuestionAnswer}
          className={QUESTION_BLOCK_ANSWER_TEXT_CLASS}
          placeholder="答え・メモを入力..."
          zoom={props.zoom}
        />
      }
    />
  );
};



export { QuestionBlockContent };
