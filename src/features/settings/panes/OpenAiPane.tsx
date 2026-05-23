import { useMemo, useState } from "react";

import { testOpenAiConnection } from "@/services/openai/openAiClient";
import {
  clearOpenAiSettings,
  DEFAULT_OPEN_AI_SETTINGS,
  loadOpenAiSettings,
  saveOpenAiSettings,
  type AiProviderMode,
  type OpenAiSettings,
} from "@/services/openai/openAiSettings";

const OPEN_AI_MODELS = ["gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.5"];

const PROVIDER_MODE_LABELS: Record<AiProviderMode, string> = {
  "local-template": "APIキー不要: ローカル簡易生成",
  "openai-user-api-key": "OpenAI API: ユーザーAPIキー課金",
};

const maskApiKey = (apiKey: string) => {
  if (!apiKey) {
    return "未設定";
  }

  if (apiKey.length <= 12) {
    return "保存済み";
  }

  return `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`;
};

const OpenAiPane = () => {
  const [settings, setSettings] = useState<OpenAiSettings>(() => loadOpenAiSettings());
  const [status, setStatus] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);

  const maskedKey = useMemo(() => maskApiKey(settings.apiKey), [settings.apiKey]);
  const usesOpenAiApi = settings.providerMode === "openai-user-api-key";

  const updateSettings = (patch: Partial<OpenAiSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    setStatus("");
  };

  const handleSave = () => {
    saveOpenAiSettings(settings);
    setSettings(loadOpenAiSettings());
    setStatus("AI設定を保存しました。");
  };

  const handleClear = () => {
    clearOpenAiSettings();
    setSettings(DEFAULT_OPEN_AI_SETTINGS);
    setStatus("AI設定を削除しました。");
  };

  const handleConnectionTest = async () => {
    setIsTesting(true);
    setStatus(usesOpenAiApi ? "接続を確認しています…" : "ローカル生成を確認しています…");

    try {
      saveOpenAiSettings(settings);
      const result = await testOpenAiConnection(settings);
      setSettings(loadOpenAiSettings());
      setStatus(
        result.model === "local-template"
          ? "APIキー不要モードのローカル生成に成功しました。"
          : "OpenAI APIへの接続に成功しました。",
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `確認に失敗しました: ${error.message}`
          : "確認に失敗しました。",
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI設定</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-6">
          APIキー不要のローカル簡易生成、またはユーザー自身のOpenAI APIキーを使う高品質生成を選べます。
          OpenAI APIモードでは、API利用料はキーを発行したOpenAIアカウント側に発生します。
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">AIモード</span>
        <select
          value={settings.providerMode}
          onChange={(event) =>
            updateSettings({ providerMode: event.target.value as AiProviderMode })
          }
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(PROVIDER_MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6">
        <p className="font-medium">現在のモード: {PROVIDER_MODE_LABELS[settings.providerMode]}</p>
        {usesOpenAiApi ? (
          <p className="text-muted-foreground">
            保存済みキー: <span className="font-mono">{maskedKey}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            APIキー不要モードは外部AI APIに送信しない簡易生成です。品質はOpenAI APIモードより限定的です。
          </p>
        )}
      </div>

      {usesOpenAiApi ? (
        <>
          <label className="block space-y-2">
            <span className="text-sm font-medium">OpenAI APIキー</span>
            <input
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(event) => updateSettings({ apiKey: event.target.value })}
              placeholder="sk-..."
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">モデル</span>
            <select
              value={settings.model}
              onChange={(event) => updateSettings({ model: event.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {OPEN_AI_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">最大出力トークン</span>
            <input
              type="number"
              min={1}
              max={8_000}
              value={settings.maxOutputTokens}
              onChange={(event) =>
                updateSettings({ maxOutputTokens: Number(event.target.value) })
              }
              className="w-48 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          保存
        </button>
        <button
          type="button"
          onClick={handleConnectionTest}
          disabled={isTesting}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {usesOpenAiApi ? "接続テスト" : "ローカル生成テスト"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          設定を削除
        </button>
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
};

export default OpenAiPane;