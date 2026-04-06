import {
  buildTypographyStyle,
  mergeStyles,
} from "@/components/card/common/cardViewZoom";
import { QuestionBlockLayout } from "@/components/card/blocks/question/QuestionBlockLayout";
import {
  QUESTION_BLOCK_ANSWER_TEXT_CLASS,
  QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
  QUESTION_BLOCK_TITLE_TEXT_CLASS,
} from "@/components/card/blocks/question/questionBlockTextStyles";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import React, { useEffect, useMemo, useState } from "react";

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
    };

export const QuestionBlockContent = (props: QuestionBlockContentProps) => {
  if (props.mode === "view") {
    return (
      <QuestionBlockViewContent
        questionTitle={props.questionTitle}
        questionAnswer={props.questionAnswer}
        answerDisplayMode={props.answerDisplayMode ?? "tap_to_reveal"}
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
        <AutoResizeTextarea
          value={props.questionTitle ?? ""}
          onChange={(e) => props.onChangeQuestionTitle(e.target.value)}
          placeholder="疑問・質問を入力..."
          minRows={1}
          lineHeight={QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX}
          allowInternalScroll={false}
          className="flex-1"
          textareaClassName={`${QUESTION_BLOCK_TITLE_TEXT_CLASS} placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0`}
        />
      }
      answerContent={
        <AutoResizeTextarea
          value={props.questionAnswer ?? ""}
          onChange={(e) => props.onChangeQuestionAnswer(e.target.value)}
          placeholder="答え・メモを入力..."
          minRows={1}
          lineHeight={QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX}
          allowInternalScroll={false}
          className="flex-1"
          textareaClassName={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} placeholder:text-slate-400 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full resize-none p-0`}
        />
      }
    />
  );
};

type QuestionBlockViewContentProps = {
  questionTitle?: string;
  questionAnswer?: string;
  answerDisplayMode: "always" | "tap_to_reveal";
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  zoom?: number;
};

const QuestionBlockViewContent = ({
  questionTitle,
  questionAnswer,
  answerDisplayMode,
  containerProps,
  zoom,
}: QuestionBlockViewContentProps) => {
  const [revealed, setRevealed] = useState(answerDisplayMode === "always");

  useEffect(() => {
    setRevealed(answerDisplayMode === "always");
  }, [answerDisplayMode, questionAnswer, questionTitle]);

  const titleStyle = useMemo(
    () =>
      buildTypographyStyle({
        fontSizePx: 12,
        lineHeightPx: QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
        zoom,
      }),
    [zoom],
  );

  const answerBaseStyle = useMemo(
    () =>
      buildTypographyStyle({
        fontSizePx: 12,
        lineHeightPx: QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
        zoom,
      }),
    [zoom],
  );

  const answerStyle = revealed
    ? answerBaseStyle
    : mergeStyles(answerBaseStyle, {
        filter: "blur(5px)",
        userSelect: "none",
        pointerEvents: "none",
      });

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
      zoom={zoom}
      containerProps={{
        ...containerProps,
        onClick: (e) => {
          containerProps?.onClick?.(e);
          e.stopPropagation();
        },
      }}
      questionContent={
        <p
          className={`flex-1 ${QUESTION_BLOCK_TITLE_TEXT_CLASS}`}
          style={titleStyle}
        >
          {questionTitle || ""}
        </p>
      }
      answerContent={
        <p
          className={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} transition-all duration-200`}
          style={answerStyle}
        >
          {questionAnswer || "\u00a0"}
        </p>
      }
      answerContainerProps={{
        onClick: (e) => {
          e.stopPropagation();
          if (!revealed) setRevealed(true);
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
