type LocalTextGenerationOptions = {
  prompt: string;
  systemPrompt?: string;
};

const MAX_SOURCE_CHARS = 1_200;
const MAX_SENTENCES = 6;

const normalizePrompt = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .trim();
const toSentences = (value: string) => {
  const normalized = normalizePrompt(value).slice(0, MAX_SOURCE_CHARS);

  return normalized
    .split(/(?<=[。．.!！?？])\s*|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, MAX_SENTENCES);
};
const buildFlashcardDraft = (sentences: string[]) => {
  if (sentences.length === 0) {
    return "入力テキストが空です。カード化したい本文を入力してください。";
  }

  const cards = sentences.map((sentence, index) => {
    const shortSentence = sentence.length > 80 ? `${sentence.slice(0, 80)}…` : sentence;

    return [
      `Q${index + 1}. 次の内容の要点は？`,
      `A${index + 1}. ${shortSentence}`,
    ].join("\n");
  });

  return [
    "APIキー不要モードでローカル簡易生成しました。",
    "外部AIには送信していないため、品質はOpenAI APIモードより限定的です。",
    "",
    ...cards,
  ].join("\n");
};
const generateTextLocally = ({ prompt, systemPrompt }: LocalTextGenerationOptions) => {
  const source = systemPrompt ? `${systemPrompt}\n${prompt}` : prompt;
  const sentences = toSentences(source);

  return buildFlashcardDraft(sentences);
};

export { generateTextLocally };

export type { LocalTextGenerationOptions };
