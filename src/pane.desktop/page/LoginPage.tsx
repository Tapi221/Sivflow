import { useState } from "react";
import { signInWithGoogle } from "@/services/auth/googleSignIn";

const isAuthPopupClosedByUserError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "auth/popup-closed-by-user";

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      console.error("ログインエラー:", error);

      if (isAuthPopupClosedByUserError(error)) {
        return;
      }

      const message = error instanceof Error ? error.message : "不明なエラー";
      alert("ログインに失敗しました: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#F3F7F8]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#9CC8C4]/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#BFD9F5]/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(255,255,255,0.35))]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl md:grid-cols-[1.2fr_0.8fr]">
          <div className="relative px-7 py-9 md:px-10 md:py-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5d7fb6]/25 bg-[#5d7fb6]/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#45679d]" />
              <span className="text-[10px] font-bold tracking-[0.22em] text-[#35507b]">
                MANIFOLIA
              </span>
            </div>
            <h1 className="mt-6 text-3xl font-black leading-tight text-slate-800 md:text-5xl">
              学習カードを
              <br />
              もっと速く、深く。
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
              フォルダ管理・復習・可視化を1つにまとめた学習ワークスペースです。Googleアカウントでそのまま始められます。
            </p>

            <div className="mt-8 grid gap-3 text-xs text-slate-700 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
                復習キューと自動下書きに対応
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
                カード編集はPC/モバイル最適化済み
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
                ローカル保存 + クラウド同期
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
                フォルダ/タグで横断検索
              </div>
            </div>
          </div>

          <div className="flex items-center bg-[linear-gradient(160deg,rgba(69,103,157,0.06),rgba(69,103,157,0.14))] px-6 py-9 md:px-8">
            <div className="w-full rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] md:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Sign In
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-800">
                ログイン
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                続行するにはGoogleアカウントで認証してください。
              </p>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5 shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2H12z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.3 2.5C5 19.9 8.2 22 12 22z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.7C2.5 9.2 2 10.6 2 12.2s.5 3 1.3 4.5l3.3-2.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M12 6.2c1.4 0 2.7.5 3.6 1.4l2.7-2.7C16.7 3.4 14.5 2.4 12 2.4c-3.8 0-7 2.1-8.7 5.3l3.3 2.5c.8-2.3 2.9-4 5.4-4z"
                      />
                    </svg>
                    Googleでログイン
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
                ログインすると、保存済みカードと設定を端末間で同期できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
