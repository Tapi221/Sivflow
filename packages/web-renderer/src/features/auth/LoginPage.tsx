import { useState } from "react";
import { signInWithGoogle } from "@/services/auth/googleSignIn";

const isAuthPopupClosedByUserError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "auth/popup-closed-by-user";

const SivflowMark = () => (
  <svg className="h-36 w-36 drop-shadow-[0_20px_34px_rgba(94,75,214,0.2)] sm:h-44 sm:w-44" viewBox="0 0 220 220" role="img" aria-label="Sivflow">
    <defs>
      <linearGradient id="sivflow-orange" x1="84" y1="10" x2="157" y2="143" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF6A00" />
        <stop offset="0.52" stopColor="#FFAA1C" />
        <stop offset="1" stopColor="#FFE45C" />
      </linearGradient>
      <linearGradient id="sivflow-cyan" x1="18" y1="89" x2="129" y2="163" gradientUnits="userSpaceOnUse">
        <stop stopColor="#37D7F5" />
        <stop offset="0.48" stopColor="#22B7F1" />
        <stop offset="1" stopColor="#2F62FF" />
      </linearGradient>
      <linearGradient id="sivflow-magenta" x1="91" y1="91" x2="184" y2="190" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FF4EAF" />
        <stop offset="0.5" stopColor="#D749F3" />
        <stop offset="1" stopColor="#723CFF" />
      </linearGradient>
    </defs>
    <path fill="url(#sivflow-orange)" d="M119.1 15.3c35.6 22 50.6 61 35.2 96.8-8.1 18.6-23.8 31.4-44.9 38.2 9-14.8 11.2-31.1 5.5-45.4-5.9-15-19.5-24.2-38.6-25.8 20.8-12.3 34-31.6 35.1-52.4.2-4.3 2.4-8.3 7.7-11.4Z" />
    <path fill="#FF4B00" fillOpacity="0.62" d="M122.5 50.5c-1.3 15.2-13.2 29.4-32.1 37.7 24.4-2.9 43.6-15 53.2-34.1-7.7 6.5-14.6 9.2-21.1 8.8 1-3.8 1-7.8 0-12.4Z" />
    <path fill="url(#sivflow-cyan)" d="M19.4 137.2c-.6-41.8 25.7-74.2 64.1-80.8 20-3.4 39 2.5 56.2 16.6-17.3-.4-32.4 6-41.6 18.3-9.7 12.9-10.8 29.3-3.2 46.9-21-12-44.4-13.7-62.9-4.3-3.9 2-8.4 2.3-12.6 3.3Z" />
    <path fill="#79E8FF" fillOpacity="0.66" d="M59.4 90.3c13.8-6.5 32.1-4.8 49.8 5.8-14.8-19.6-35.1-29.5-56.1-27.5 9.5 3.3 15.4 7.9 18.4 13.7-3.9 1.1-7.8 3.7-12.1 8Z" />
    <path fill="url(#sivflow-magenta)" d="M186.3 171.3c-35 22.8-76.1 19.7-101.4-9.8-13.2-15.4-18-34.7-14.5-56.7 8.7 15 21.8 24.8 37 26.8 16 2.1 30.8-5 42.5-20.2.2 24.2 10.1 45.5 26.9 57.7 3.5 2.5 6 6.4 9.5 2.2Z" />
    <path fill="#FF8CDE" fillOpacity="0.62" d="M127.4 162.4c-12.6-8.7-20.1-25.5-20.6-46.1-9.5 22.7-8.7 45.2 2.9 62.8 1.4-10 4.4-16.8 9.4-21 2.7 2.9 5.8 4.4 8.3 4.3Z" />
    <circle cx="111" cy="111" r="27" fill="white" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2H12z" />
    <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.3 2.5C5 19.9 8.2 22 12 22z" />
    <path fill="#FBBC05" d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.7C2.5 9.2 2 10.6 2 12.2s.5 3 1.3 4.5l3.3-2.5z" />
    <path fill="#4285F4" d="M12 6.2c1.4 0 2.7.5 3.6 1.4l2.7-2.7C16.7 3.4 14.5 2.4 12 2.4c-3.8 0-7 2.1-8.7 5.3l3.3 2.5c.8-2.3 2.9-4 5.4-4z" />
  </svg>
);

const LoginPage = () => {
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_0%_100%,rgba(126,181,255,0.46),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(252,172,224,0.42),transparent_34%),linear-gradient(116deg,#eef8ff_0%,#ffffff_48%,#fff3fa_100%)] px-4 py-6 text-[#061947] sm:px-6 lg:p-10">
      <div className="pointer-events-none absolute -left-28 bottom-0 h-[34rem] w-[42rem] rotate-[-18deg] rounded-[100%] bg-[linear-gradient(135deg,rgba(90,151,255,0.28),rgba(180,157,255,0.2),transparent_70%)] blur-sm" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[32rem] w-[40rem] rotate-[16deg] rounded-[100%] bg-[linear-gradient(135deg,transparent_24%,rgba(255,187,231,0.3),rgba(255,217,242,0.42))] blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,rgba(255,255,255,0.36),rgba(255,255,255,0.82)_47%,rgba(255,255,255,0.42))]" />

      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-[1430px] overflow-hidden rounded-[22px] border border-white/80 bg-white/[0.82] shadow-[0_30px_90px_rgba(58,79,116,0.18)] backdrop-blur-2xl lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-2">
        <div className="relative flex min-h-[520px] items-center justify-center overflow-hidden border-b border-slate-200/50 px-8 py-12 lg:border-b-0 lg:border-r lg:px-10">
          <div className="pointer-events-none absolute -bottom-16 -left-20 h-72 w-[44rem] rotate-[-13deg] rounded-[100%] bg-[linear-gradient(135deg,rgba(102,160,255,0.18),rgba(167,145,255,0.16),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute -bottom-28 left-4 h-72 w-[44rem] rotate-[-7deg] rounded-[100%] border-t border-white/80 bg-[linear-gradient(135deg,rgba(130,197,255,0.2),rgba(225,209,255,0.24),rgba(255,255,255,0))]" />

          <div className="relative flex max-w-xl flex-col items-center text-center">
            <SivflowMark />
            <h1 className="mt-2 text-6xl font-black tracking-[-0.06em] text-[#061947] sm:text-7xl">
              Sivflow
            </h1>
            <p className="mt-4 text-xl font-medium tracking-wide text-[#4d5a73] sm:text-2xl">
              Write. Connect. Evolve.
            </p>
            <p className="mt-8 text-lg font-medium leading-relaxed tracking-wide text-[#65728d] sm:text-xl">
              思考をつなぎ、学びを進化させる
              <br />
              次世代フラッシュカードプラットフォーム
            </p>
          </div>
        </div>

        <div className="flex min-h-[520px] items-center justify-center px-8 py-12 lg:px-10">
          <div className="flex w-full max-w-[520px] flex-col items-center">
            <h2 className="text-4xl font-black tracking-[0.08em] text-[#061947]">
              ログイン
            </h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="mt-16 flex h-[76px] w-full max-w-[510px] items-center justify-center gap-5 rounded-xl border border-[#d9dee8] bg-white px-8 text-2xl font-bold text-[#061947] shadow-[0_10px_24px_rgba(12,27,60,0.12)] transition hover:-translate-y-0.5 hover:border-[#c5cfde] hover:shadow-[0_14px_30px_rgba(12,27,60,0.16)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 rounded-full bg-[#7b89a6]" />
                  ログイン中...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Google でログイン
                </>
              )}
            </button>

            <div className="mt-14 flex w-full max-w-[510px] items-center gap-8">
              <div className="h-px flex-1 bg-[#e5e9f1]" />
              <span className="text-lg font-semibold text-[#7c89a5]">または</span>
              <div className="h-px flex-1 bg-[#e5e9f1]" />
            </div>

            <div className="mt-14 flex max-w-[510px] items-center gap-6 text-[#64718d]">
              <svg className="h-11 w-11 shrink-0 text-[#7d8aa5]" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M24 6.5 38 12v10.6c0 8.9-5.4 16.8-14 19.4-8.6-2.6-14-10.5-14-19.4V12l14-5.5Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" />
                <path d="m18.2 24.2 4.1 4.1 7.8-8.6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-lg font-semibold leading-relaxed tracking-wide">
                ログインすると、あなたのデータは
                <br />
                安全に同期・バックアップされます。
              </p>
            </div>

            <div className="mt-24 h-px w-full max-w-[510px] bg-[#dfe5ee]" />

            <p className="mt-10 flex items-center gap-5 text-lg font-semibold tracking-wide text-[#65718d]">
              <span className="text-3xl text-[#3b8cff]" aria-hidden="true">
                ✨
              </span>
              初めての方も、Googleでそのまま開始できます
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export { LoginPage };
