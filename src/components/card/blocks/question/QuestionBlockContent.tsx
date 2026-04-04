import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import { QuestionBlockLayout } from "@/components/card/blocks/question/QuestionBlockLayout";
import {
  QUESTION_BLOCK_ANSWER_TEXT_CLASS,
  QUESTION_BLOCK_TEXT_LINE_HEIGHT_PX,
  QUESTION_BLOCK_TITLE_TEXT_CLASS,
} from "@/components/card/blocks/question/questionBlockTextStyles";
import React, { useState } from "react";

type QuestionBlockContentProps =
  | {
      mode: "view";
      questionTitle?: string;
      questionAnswer?: string;
      answerDisplayMode?: "always" | "tap_to_reveal";
      containerProps?: React.HTMLAttributes<HTMLDivElement>;
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
};

const QuestionBlockViewContent = ({
  questionTitle,
  questionAnswer,
  answerDisplayMode,
  containerProps,
}: QuestionBlockViewContentProps) => {
  const [revealed, setRevealed] = useState(answerDisplayMode === "always");

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
        <p className={`flex-1 ${QUESTION_BLOCK_TITLE_TEXT_CLASS}`}>
          {questionTitle || ""}
        </p>
      }
      answerContent={
        <p
          className={`${QUESTION_BLOCK_ANSWER_TEXT_CLASS} transition-all duration-200`}
          style={
            revealed
              ? undefined
              : {
                  filter: "blur(5px)",
                  userSelect: "none",
                  pointerEvents: "none",
                }
          }
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
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">
            タップして表示
          </span>
        ) : undefined
      }
    />
  );
};