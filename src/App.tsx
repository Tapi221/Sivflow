import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import { BlockNoteSandboxPage } from "@/sandbox/blocknote";
import { sanitizeForLog } from "@/utils/logSanitizer";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { NotificationProvider } from "./components/notifications/NotificationProvider";
import { AccountLockedScreen } from "./components/security/AccountLockedScreen";
import { useAuthSession } from "./contexts/auth/AuthSessionContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { flags } from "./features/flags";
import { useSync } from "./hooks/sync/useSync";
import Layout from "./Layout";
import { signInWithGoogle } from "./services/auth/googleSignIn";
import { autoBackupService } from "./services/AutoBackupService";
import { dataIntegrityService } from "./services/DataIntegrityService";
import { SyncServiceFactory } from "./services/SyncServiceFactory";
import { DEV_MODE, isLocalHost } from "./utils/envGuards";

const Calendar = lazy(() => import("./pages/Calendar"));
const Folders = lazy(() => import("./pages/Folders"));
const CardEdit = lazy(() => import("./pages/CardEdit"));
const CardView = lazy(() => import("./pages/CardView"));
const StudyMode = lazy(() => import("./pages/StudyMode"));
const Trash = lazy(() => import("./pages/Trash"));
const ImageDiagnostics = lazy(() => import("./pages/ImageDiagnostics"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Directory = lazy(() => import("./pages/Directory"));
const Dictionary = lazy(() => import("./pages/Dictionary"));
const Questions = lazy(() => import("./pages/Questions"));

const PdfScrollTest = DEV_MODE
  ? lazy(() => import("./pages/PdfScrollTest"))
  : null;
const CodeBlockVisualTest = DEV_MODE
  ? lazy(() => import("./pages/CodeBlockVisualTest"))
  : null;
const CardLayoutConsistencyTest = DEV_MODE
  ? lazy(() => import("./pages/CardLayoutConsistencyTest"))
  : null;

const isTestBypassEnabled = () => {
  const hasBypassParam =
    new URLSearchParams(window.location.search).get("test_bypass") === "true";

  if (!hasBypassParam) {
    return false;
  }

  if (!DEV_MODE) {
    return false;
  }

  return isLocalHost(window.location.hostname);
};

const LoadingFallback = () => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#EEF3F6] animate-in fade-in duration-300">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-600/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuthSession();

  if (loading) {
    return <LoadingFallback />;
  }

  const isTestBypass = isTestBypassEnabled();

  if (!currentUser && !isTestBypass) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const isAuthPopupClosedByUserError = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/popup-closed-by-user";

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
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7BACAA]/25 bg-[#7BACAA]/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-[#689A98]" />
              <span className="text-[10px] font-bold tracking-[0.22em] text-[#5A8684]">
                MANIFOLMIA
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

          <div className="flex items-center bg-[linear-gradient(160deg,rgba(104,154,152,0.06),rgba(104,154,152,0.14))] px-6 py-9 md:px-8">
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
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
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

const DefaultRedirect = () => {
  return <Navigate to="/folders" replace />;
};

const AppContent = () => {
  const { currentUser, loading } = useAuthSession();
  const { syncProgress } = useSync();
  const startedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const resetQueue = async () => {
      const { resetOperationQueue } = await import("./utils/queueUtils");
      resetOperationQueue();
    };

    if (!currentUser?.uid) {
      startedUserIdRef.current = null;
      void resetQueue();
      return () => {
        disposed = true;
      };
    }

    const userId = currentUser.uid;

    if (startedUserIdRef.current === userId) {
      return () => {
        disposed = true;
      };
    }

    startedUserIdRef.current = userId;

    const runStartupTasks = async () => {
      try {
        const { initializeOperationQueue } = await import("./utils/queueUtils");
        await initializeOperationQueue(userId);

        if (disposed) {
          return;
        }

        console.log("[Queue] Operation Queue initialized", { userId });

        const didBackup = await autoBackupService.performAutoBackup(userId);

        if (disposed) {
          return;
        }

        if (didBackup) {
          console.log("Auto backup completed on startup");
        }

        const report = await dataIntegrityService.checkIntegrity();

        if (disposed) {
          return;
        }

        if (!report.isHealthy) {
          const issueSummary = report.issues.reduce<Record<string, number>>(
            (acc, issue) => {
              acc[issue.code] = (acc[issue.code] || 0) + 1;
              return acc;
            },
            {},
          );

          console.error(
            "[Critical] Data integrity issues found:",
            report.issues.length,
            sanitizeForLog(issueSummary),
          );
        } else {
          console.log(
            "[Safe] Data integrity check passed (0 errors). Healthy items:",
            report.totalCards,
            "cards,",
            report.totalFolders,
            "folders.",
          );
        }

        if (flags.isEnabled("USE_SYNC_V2")) {
          console.log("[Sync] Startup sync initiated");
          const syncService = await SyncServiceFactory.getInstance(userId);

          if (disposed) {
            return;
          }

          await syncService.performStartupSync();
        }
      } catch (error) {
        console.error(
          "[Critical] Startup tasks failed:",
          sanitizeForLog(error),
        );
      }
    };

    void runStartupTasks();

    return () => {
      disposed = true;
    };
  }, [currentUser?.uid]);

  const isTestBypass = isTestBypassEnabled();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser && !isTestBypass) {
    return <LoginPage />;
  }

  if (
    PdfScrollTest &&
    isTestBypass &&
    window.location.pathname === "/pdf-scroll-test"
  ) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PdfScrollTest />
      </Suspense>
    );
  }

  if (
    CodeBlockVisualTest &&
    isTestBypass &&
    window.location.pathname === "/codeblock-visual-test"
  ) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CodeBlockVisualTest />
      </Suspense>
    );
  }

  return (
    <>
      <AccountLockedScreen />

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultRedirect />} />

          <Route
            path="folders"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Folders />
              </Suspense>
            }
          />

          <Route
            path="dictionary"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Dictionary />
              </Suspense>
            }
          />

          <Route
            path="questions"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Questions />
              </Suspense>
            }
          />

          <Route path="CardEdit" element={<CardEdit />} />
          <Route path="CardView" element={<CardView />} />
          <Route path="study" element={<StudyMode />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="sandbox/blocknote" element={<BlockNoteSandboxPage />} />

          <Route
            path="gallery"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Gallery />
              </Suspense>
            }
          />
          <Route path="trash" element={<Trash />} />
          <Route
            path="directory"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Directory />
              </Suspense>
            }
          />
          <Route
            path="diagnostics"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ImageDiagnostics />
              </Suspense>
            }
          />

          {PdfScrollTest ? (
            <Route
              path="pdf-scroll-test"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <PdfScrollTest />
                </Suspense>
              }
            />
          ) : null}

          {CodeBlockVisualTest ? (
            <Route
              path="codeblock-visual-test"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CodeBlockVisualTest />
                </Suspense>
              }
            />
          ) : null}

          {CardLayoutConsistencyTest ? (
            <Route
              path="card-layout-test"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CardLayoutConsistencyTest />
                </Suspense>
              }
            />
          ) : null}
        </Route>

        <Route path="*" element={<Navigate to="/folders" replace />} />
      </Routes>

      {syncProgress ? (
        <div className="fixed bottom-8 right-8 z-[9999] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="flex min-w-[240px] items-center gap-4 rounded-[24px] border border-white bg-white/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-4 border-primary-600/10" />
              <div className="absolute left-0 top-0 h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
            <div className="flex-1">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600">
                Cloud Sync
              </p>
              <p className="max-w-[160px] truncate text-xs font-bold text-slate-600">
                {syncProgress}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <BreadcrumbProvider>
              <Suspense fallback={<LoadingFallback />}>
                <AppContent />
              </Suspense>
            </BreadcrumbProvider>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
