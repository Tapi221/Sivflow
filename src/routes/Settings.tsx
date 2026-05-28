import { signOut } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/services/firebase";
import { useAuthSession } from "@/contexts/AuthContext";

const WEB_LOGOUT_DESCRIPTION = "Web 用の仮ログアウトです。ログアウト後はログイン画面に戻ります。";

const Settings = () => {
  const { currentUser } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOut(auth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ログアウトに失敗しました");
      setIsSigningOut(false);
    }
  };

  return (
    <main className="h-full min-h-0 overflow-auto bg-[#f8f8f8] px-8 py-8 text-[#2f2f2f]">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
        <header className="flex flex-col gap-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#9a9a9a]">Settings</p>
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#222]">設定</h1>
        </header>

        <section className="rounded-[22px] border border-[#ececec] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-[#2f2f2f]">アカウント</h2>
              <p className="mt-1 text-[13px] leading-5 text-[#7a7f89]">{WEB_LOGOUT_DESCRIPTION}</p>
              <p className="mt-2 truncate text-[12px] font-semibold text-[#9a9a9a]">
                {currentUser?.email ?? "ログイン中のユーザー"}
              </p>
            </div>

            <button
              type="button"
              className="h-10 shrink-0 rounded-full bg-[#2f2f2f] px-5 text-[13px] font-bold text-white transition hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-[14px] bg-[#fff4f4] px-4 py-3 text-[12px] font-semibold text-[#c25f5f]">
              {errorMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

export default Settings;
