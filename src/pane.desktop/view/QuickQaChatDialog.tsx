import { memo, useCallback, useMemo, useRef, useState } from "react";
import { generateOllamaAnswer } from "@platform/ai/ollamaClient";
import { useToast } from "@web-renderer/contexts/ToastContext";
import type { KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/chip/ui/dialog/dialog";
import { useCardCommands } from "@/components/card/hooks/useCardCommands";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { MessageSquare, Plus, Sparkles } from "@/ui/icons";



type QuickQaChatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
type ChatStep = "question" | "answer";
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};
type LoadingStatusPillProps = {
  label: string;
};



const MAX_QUESTION_LENGTH = 240;
const MAX_ANSWER_LENGTH = 3000;



const createChatMessage = (role: ChatMessage["role"], text: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  text,
});
const createInitialMessages = (): ChatMessage[] => [createChatMessage("assistant", "疑問を入力してください。入力したら、次に回答を聞きます。")];
const trimMessage = (value: string, maxLength: number): string => value.trim().slice(0, maxLength);
const createCardTitle = (question: string): string => {
  const normalized = question.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 80)}…` : normalized;
};



const LoadingStatusPill = ({ label }: LoadingStatusPillProps) => {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-[18px] border border-[#eceae4] bg-white px-3 py-2 text-[12px] text-[#8a857f] shadow-sm">
        <LoadingSpinner iconClassName="h-3.5 w-3.5" label={label} />
        {label}
      </div>
    </div>
  );
};
const QuickQaChatDialogComponent = ({ open, onOpenChange }: QuickQaChatDialogProps) => {
  const toast = useToast();
  const { createCard } = useCardCommands();
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [step, setStep] = useState<ChatStep>("question");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAiAnswer, setIsGeneratingAiAnswer] = useState(false);

  const placeholder = step === "question" ? "例: GPUアクセラレーションって何？" : "回答を入力...";
  const inputMaxLength = step === "question" ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH;
  const canSend = inputValue.trim().length > 0 && !isCreating && !isGeneratingAiAnswer;
  const canGenerateAiAnswer = step === "answer" && pendingQuestion.trim().length > 0 && !isCreating && !isGeneratingAiAnswer;

  const resetChat = useCallback(() => {
    setStep("question");
    setPendingQuestion("");
    setInputValue("");
    setMessages(createInitialMessages());
  }, []);

  const focusInputSoon = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const appendMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages((currentMessages) => [...currentMessages, ...nextMessages]);
  }, []);

  const handleCreateCardFromAnswer = useCallback(async (question: string, answer: string) => {
    setIsCreating(true);

    try {
      const title = createCardTitle(question);
      const createdCard = await createCard({
        title,
        isDraft: answer.length === 0,
        hasUncertainty: false,
        front: {
          blocks: [{ id: crypto.randomUUID(), type: "question", orderIndex: 0, questionTitle: question, questionAnswer: "" }],
        },
        back: {
          blocks: [{ id: crypto.randomUUID(), type: "text", orderIndex: 0, content: answer }],
        },
      });

      appendMessages([
        createChatMessage("assistant", `カードを作成しました: ${title}`),
        createChatMessage("assistant", "続けて次の疑問を入力できます。"),
      ]);
      setStep("question");
      setPendingQuestion("");
      setInputValue("");
      openCardTab({ cardId: createdCard.id, title, folderId: createdCard.folderId ?? null });
      toast.success("Q&Aカードを作成しました。");
      focusInputSoon();
    } catch (error) {
      console.error("[QuickQaChatDialog] failed to create Q&A card", error);
      toast.error("Q&Aカードを作成できませんでした。");
    } finally {
      setIsCreating(false);
    }
  }, [appendMessages, createCard, focusInputSoon, openCardTab, toast]);

  const handleGenerateAiAnswer = useCallback(async () => {
    const question = trimMessage(pendingQuestion, MAX_QUESTION_LENGTH);
    if (!question || !canGenerateAiAnswer) return;

    setIsGeneratingAiAnswer(true);
    appendMessages([createChatMessage("assistant", "ローカルAIで回答案を作成しています。")]);

    try {
      const result = await generateOllamaAnswer({ question });
      setInputValue(result.answer.slice(0, MAX_ANSWER_LENGTH));
      appendMessages([createChatMessage("assistant", `回答案を作成しました。モデル: ${result.model}`)]);
      toast.success("AI回答案を作成しました。");
      focusInputSoon();
    } catch (error) {
      console.error("[QuickQaChatDialog] failed to generate AI answer", error);
      appendMessages([createChatMessage("assistant", "Ollamaに接続できませんでした。Ollama起動後、llama3.2:3b などのモデルを用意してください。")]);
      toast.error("ローカルAIに接続できませんでした。");
    } finally {
      setIsGeneratingAiAnswer(false);
    }
  }, [appendMessages, canGenerateAiAnswer, focusInputSoon, pendingQuestion, toast]);

  const handleSend = useCallback(() => {
    const value = trimMessage(inputValue, inputMaxLength);
    if (!value || isCreating || isGeneratingAiAnswer) return;

    if (step === "question") {
      setPendingQuestion(value);
      setStep("answer");
      setInputValue("");
      appendMessages([
        createChatMessage("user", value),
        createChatMessage("assistant", "回答を入力してください。AI回答案を使うこともできます。"),
      ]);
      focusInputSoon();
      return;
    }

    appendMessages([createChatMessage("user", value)]);
    void handleCreateCardFromAnswer(pendingQuestion, value);
  }, [appendMessages, focusInputSoon, handleCreateCardFromAnswer, inputMaxLength, inputValue, isCreating, isGeneratingAiAnswer, pendingQuestion, step]);

  const handleCreateDraftWithoutAnswer = useCallback(() => {
    const question = trimMessage(pendingQuestion, MAX_QUESTION_LENGTH);
    if (!question || isCreating || isGeneratingAiAnswer) return;

    appendMessages([createChatMessage("assistant", "回答なしの下書きカードとして作成します。")]);
    void handleCreateCardFromAnswer(question, "");
  }, [appendMessages, handleCreateCardFromAnswer, isCreating, isGeneratingAiAnswer, pendingQuestion]);

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    handleSend();
  }, [handleSend]);

  const latestQuestionLabel = useMemo(() => {
    if (!pendingQuestion) return null;
    return pendingQuestion.length > 56 ? `${pendingQuestion.slice(0, 56)}…` : pendingQuestion;
  }, [pendingQuestion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-modal-surface max-w-[560px] gap-0 p-0">
        <DialogTitle className="sr-only">Q&Aチャット</DialogTitle>
        <DialogDescription className="sr-only">チャット形式でQ&Aカードを作成します。</DialogDescription>
        <div className="border-b border-[#eceae4] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#dddcd5] bg-white text-[#85827e]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#343434]">Q&Aチャット</p>
              <p className="mt-0.5 text-[11px] text-[#8a857f]">OllamaのローカルAI回答案を使えます。</p>
            </div>
          </div>
        </div>
        <div className="max-h-[420px] min-h-[260px] overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-2.5">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[84%] rounded-[18px] px-3 py-2 text-[12px] leading-relaxed shadow-sm", message.role === "user" ? "bg-[#343434] text-white" : "border border-[#eceae4] bg-white text-[#4b4b4b]")}>{message.text}</div>
              </div>
            ))}
            {isCreating || isGeneratingAiAnswer ? <LoadingStatusPill label={isGeneratingAiAnswer ? "AI回答案を作成中" : "カード作成中"} /> : null}
          </div>
        </div>
        <div className="border-t border-[#eceae4] bg-white/80 px-4 py-3">
          {latestQuestionLabel ? (
            <div className="mb-2 rounded-[10px] border border-[#eceae4] bg-[#f7f6f2] px-2.5 py-1.5 text-[11px] text-[#77736d]">
              Q: {latestQuestionLabel}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea ref={inputRef} value={inputValue} onChange={(event) => setInputValue(event.target.value.slice(0, inputMaxLength))} onKeyDown={handleInputKeyDown} placeholder={placeholder} rows={step === "question" ? 2 : 4} className="max-h-[160px] min-h-[42px] min-w-0 flex-1 resize-none rounded-[14px] border border-[#dddcd5] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#343434] outline-none transition placeholder:text-[#aaa49d] focus:border-[#c8c6bf]" />
            <button type="button" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#343434] bg-[#343434] px-4 text-[12px] font-semibold text-white transition hover:bg-[#1f1f1f] disabled:border-[#dddcd5] disabled:bg-[#eee] disabled:text-[#aaa49d]" onClick={handleSend} disabled={!canSend}>
              {isCreating ? <LoadingSpinner iconClassName="h-4 w-4" label="送信中" /> : "送信"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button type="button" className="text-[11px] font-medium text-[#8a857f] underline-offset-2 hover:text-[#343434] hover:underline disabled:opacity-60" onClick={resetChat} disabled={isCreating || isGeneratingAiAnswer}>リセット</button>
            <div className="flex items-center gap-3">
              {step === "answer" ? (
                <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8a857f] underline-offset-2 hover:text-[#343434] hover:underline disabled:opacity-60" onClick={handleGenerateAiAnswer} disabled={!canGenerateAiAnswer}>
                  {isGeneratingAiAnswer ? <LoadingSpinner iconClassName="h-3 w-3" label="AI回答案を作成中" /> : <Sparkles className="h-3 w-3" />}
                  AIで回答案
                </button>
              ) : null}
              {step === "answer" ? (
                <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8a857f] underline-offset-2 hover:text-[#343434] hover:underline disabled:opacity-60" onClick={handleCreateDraftWithoutAnswer} disabled={isCreating || isGeneratingAiAnswer || !pendingQuestion}>
                  <Plus className="h-3 w-3" />
                  回答なしで下書き作成
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};



const QuickQaChatDialog = memo(QuickQaChatDialogComponent);
QuickQaChatDialog.displayName = "QuickQaChatDialog";

export { QuickQaChatDialog };


export type { QuickQaChatDialogProps };
