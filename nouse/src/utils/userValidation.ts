/**
 * ユーザーネームのバリデーション結果
 */
interface ValidationResult {
  isValid: boolean;
  message: string;
}



/**
 * ユーザーネームバリデーションユーティリティ
 */
const USERNAME_VALIDATION = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 20,
  // 許可される文字: 日本語（ひらがな、カタカナ、漢字）、英数字、スペース、ハイフン、アンダースコア
  // Unicodeプロパティを使用して日本語を判定
  ALLOWED_CHARS_REGEX:
    /^[a-zA-Z0-9\s\-_ \u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+$/,
};



/**
 * 文字列をUnicode単位（サロゲートペア対応）でカウントする
 * 日本語、英語、絵文字すべてを1文字としてカウント
 */
const countUnicodeCharacters = (str: string) => {
  // Array.from はサロゲートペアを適切に処理する
  return Array.from(str).length;
};
/**
 * ユーザーネームのバリデーションを実行する
 */
const validateUsername = (username: string) => {
  // 前後の空白をトリミング（要件：先頭と末尾のスペースは自動的にトリミングする）
  const trimmedName = username.trim();

  // 空白のみのチェック
  if (trimmedName.length === 0) {
    return {
      isValid: false,
      message: "ユーザーネームを入力してください。（空白のみは不可）",
    };
  }

  // 文字数カウント (Unicode単位)
  const charCount = countUnicodeCharacters(trimmedName);

  // 最小文字数チェック
  if (charCount < USERNAME_VALIDATION.MIN_LENGTH) {
    return {
      isValid: false,
      message: `ユーザーネームは${USERNAME_VALIDATION.MIN_LENGTH}文字以上で入力してください。`,
    };
  }

  // 最大文字数チェック
  if (charCount > USERNAME_VALIDATION.MAX_LENGTH) {
    return {
      isValid: false,
      message: `ユーザーネームは${USERNAME_VALIDATION.MAX_LENGTH}文字以内で入力してください。`,
    };
  }

  // 使用可能文字のチェック
  // 日本語、英数字、スペース、ハイフン、アンダースコアのみ許可
  if (!USERNAME_VALIDATION.ALLOWED_CHARS_REGEX.test(trimmedName)) {
    return {
      isValid: false,
      message:
        "ユーザーネームに使用できない文字が含まれています。（日本語、英数字、スペース、ハイフン、アンダースコアが使用可能です）",
    };
  }

  return { isValid: true, message: "" };
};
/**
 * 表示用に文字列を省略する（Unicode単位）
 */
const truncateUsername = (name: string, maxLength: number = 20) => {
  if (!name) return "";

  const chars = Array.from(name);
  if (chars.length <= maxLength) {
    return name;
  }

  return chars.slice(0, maxLength).join("") + "...";
};



export { countUnicodeCharacters, validateUsername, truncateUsername };


export type { ValidationResult };
