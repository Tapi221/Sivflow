// ルーティングに必要なコンポーネント・フックを react-router-dom から読み込み
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// React 本体からサスペンス（遅延読み込み用）、lazy（動的 import）、状態管理・副作用フック
import { Suspense, lazy, useState, useEffect } from 'react';
// 認証状態をアプリ全体に配るコンテキスト
import { AuthProvider } from './contexts/AuthContext';
// トースト（画面右上などに出る通知）を配るコンテキスト
import { ToastProvider } from './contexts/ToastContext';
// 通知用の Provider（多分リアルタイム通知など）
import { NotificationProvider } from './Components/notifications/NotificationProvider';
// 認証状態を取得するためのカスタムフック
import { useAuth } from './contexts/AuthContext';
// 画面の共通レイアウトコンポーネント（ヘッダーやサイドバーなど）
import Layout from './Layout';
// Firebase 認証の signOut 関数
import { signOut } from 'firebase/auth';
// 初期化済みの Firebase Auth インスタンス
import { auth } from './services/firebase';
// ダッシュボード用のローディングスケルトン
import { DashboardSkeleton } from './Components/skeletons/DashboardSkeleton';
// 自動バックアップ関連のサービス
import { autoBackupService } from './services/AutoBackupService';
// データ整合性チェックのサービス
import { dataIntegrityService } from './services/DataIntegrityService';
import { sanitizeForLog } from '@/utils/logSanitizer';
// 同期の進捗などを扱うカスタムフック
import { useSync } from './hooks/useSync';
// アカウントロック時に表示する画面
import { AccountLockedScreen } from './Components/security/AccountLockedScreen';
// 同期サービスを生成するファクトリ
import { SyncServiceFactory } from './services/SyncServiceFactory';
// 機能フラグ（Feature Flag）管理
import { flags } from './features/flags';
import { DEV_MODE, isLocalHost } from './utils/envGuards';


// ===== ページコンポーネントを遅延読み込み（コード分割） =====
// 初回ロードを軽くするために、各ページを lazy で動的 import する
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const Calendar = lazy(() => import('./Pages/Calendar'));
const Folders = lazy(() => import('./Pages/Folders'));
const CardEdit = lazy(() => import('./Pages/CardEdit'));
const CardView = lazy(() => import('./Pages/CardView'));
const StudyMode = lazy(() => import('./Pages/StudyMode'));
const Trash = lazy(() => import('./Pages/Trash'));
const ImageDiagnostics = lazy(() => import('./Pages/ImageDiagnostics'));
const Gallery = lazy(() => import('./Pages/Gallery'));
const TodayStudy = lazy(() => import('./Pages/TodayStudy'));
const NotImplementedPlaceholder = lazy(() => import('./Pages/NotImplementedPlaceholder'));
const OneQAMode = lazy(() => import('./Pages/OneQAMode'));
const PairMode = lazy(() => import('./Pages/PairMode'));
const FourChoiceMode = lazy(() => import('./Pages/FourChoiceMode'));
const PdfScrollTest = DEV_MODE
  ? lazy(() => import('./Pages/PdfScrollTest'))
  : null;
const CodeBlockVisualTest = DEV_MODE
  ? lazy(() => import('./Pages/CodeBlockVisualTest'))
  : null;
const CardLayoutConsistencyTest = DEV_MODE
  ? lazy(() => import('./Pages/CardLayoutConsistencyTest'))
  : null;

const isTestBypassEnabled = () => {
  const hasBypassParam = new URLSearchParams(window.location.search).get('test_bypass') === 'true';
  if (!hasBypassParam) return false;
  // Guard 1: development mode 以外（production build 含む）では絶対に有効化しない
  // NOTE: 一部環境で NODE_ENV=production が常時セットされるため、DEV ではなく MODE を使う。
  if (!DEV_MODE) return false;
  // Guard 2: 開発中でも localhost 系ホストのみ許可
  return isLocalHost(window.location.hostname);
};


// ===== サスペンス用ローディング UI =====
function LoadingFallback() {
  return (
    // 画面全体を覆うローディング画面（Tailwind で中央寄せ＆背景など指定）
    <div className="h-[100dvh] flex items-center justify-center bg-[#F8FAFB] animate-in fade-in duration-500">
      <div className="text-center">
        {/* 二重の丸いボーダーでローディングスピナーを作っている */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-primary-600/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-primary-600 font-bold tracking-[0.3em] text-[10px] opacity-50">
          INITIALIZING
        </p>
      </div>
    </div>
  );
}


// ===== 認証が必要なルートを守るコンポーネント =====
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 現在のユーザーと認証状態読み込み中かどうかを取得
  const { currentUser, loading } = useAuth();

  // 認証状態をまだ取得中ならローディング画面を表示
  // ⚠ AuthProvider は children を常にレンダリングするようになったため、
  //   ProtectedRoute が loading ガードの唯一の砦となる。
  if (loading) {
    return <LoadingFallback />;
  }

  // 開発環境かどうか
  // 開発中、または localhost 上の E2E 実行時のみ認証バイパスを許可
  const isTestBypass = isTestBypassEnabled();

  // ログインしていない & バイパスも無効 → ルート("/") にリダイレクト
  if (!currentUser && !isTestBypass) {
    return <Navigate to="/" replace />;
  }

  // 条件を満たしていれば子要素をそのまま表示（= 保護されたページに入れる）
  return <>{children}</>;
}


// ===== ログインページ（トップで表示される画面） =====
function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Google ログインボタンが押されたときの処理
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // firebase/auth を動的 import（初期表示を軽くするため）
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      // ポップアップで Google 認証
      await signInWithPopup(auth, provider);
      // 成功すると AuthProvider 側の onAuthStateChanged が発火して画面遷移する想定
    } catch (error: unknown) {
      console.error('ログインエラー:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        // ユーザーがポップアップを閉じた場合は無視
      } else {
        alert('ログインに失敗しました: ' + (error.message || '不明なエラー'));
      }
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
              <span className="text-[10px] font-bold tracking-[0.22em] text-[#5A8684]">MANIFOLMIA</span>
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
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">復習キューと自動下書きに対応</div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">カード編集はPC/モバイル最適化済み</div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">ローカル保存 + クラウド同期</div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">フォルダ/タグで横断検索</div>
            </div>
          </div>

          <div className="flex items-center bg-[linear-gradient(160deg,rgba(104,154,152,0.06),rgba(104,154,152,0.14))] px-6 py-9 md:px-8">
            <div className="w-full rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] md:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Sign In</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-800">ログイン</h2>
              <p className="mt-2 text-sm text-slate-500">続行するにはGoogleアカウントで認証してください。</p>

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
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2H12z" />
                      <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.3 2.5C5 19.9 8.2 22 12 22z" />
                      <path fill="#FBBC05" d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.7C2.5 9.2 2 10.6 2 12.2s.5 3 1.3 4.5l3.3-2.5z" />
                      <path fill="#4285F4" d="M12 6.2c1.4 0 2.7.5 3.6 1.4l2.7-2.7C16.7 3.4 14.5 2.4 12 2.4c-3.8 0-7 2.1-8.7 5.3l3.3 2.5c.8-2.3 2.9-4 5.4-4z" />
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
}


/**
 * "/" は常に Dashboard へ。
 * リロード時の画面復帰はブラウザURLに任せる。
 */
function DefaultRedirect() {
  return <Navigate to="/Dashboard" replace />;
}

// ===== アプリ本体のルーティング・起動処理をまとめたコンポーネント =====
function AppContent() {
  const { currentUser, loading } = useAuth();
  const [currentPageName, setCurrentPageName] = useState('Dashboard');

  // 差分同期の進捗（文字列など）を取得
  const { syncProgress } = useSync();

  // ユーザーがログインしている場合にだけ、起動時タスクを走らせる
  useEffect(() => {
    if (!currentUser) return;

    const runStartupTasks = async () => {
      try {
        // 1. Operation Queue 初期化（オフライン操作のキューなど？）
        const { initializeOperationQueue } = await import('./utils/queueUtils');
        await initializeOperationQueue();
        console.log('[Queue] Operation Queue initialized');

        // 2. 自動バックアップ（1日1回だけ実行される想定）
        const didBackup = await autoBackupService.performAutoBackup(currentUser.uid);
        if (didBackup) {
          console.log('Auto backup completed on startup');
        }

        // 3. データ整合性チェック（DB 健全性チェック）
        const report = await dataIntegrityService.checkIntegrity();
        if (!report.isHealthy) {
          const issueSummary = report.issues.reduce<Record<string, number>>((acc, issue) => {
            acc[issue.code] = (acc[issue.code] || 0) + 1;
            return acc;
          }, {});
          console.error(
            '[Critical] Data integrity issues found:',
            report.issues.length,
            sanitizeForLog(issueSummary),
          );
        } else {
          console.log(
            '[Safe] Data integrity check passed (0 errors). Healthy items:',
            report.totalCards,
            'cards,',
            report.totalFolders,
            'folders.',
          );
        }

        // 4. V2 同期（Feature Flag が ON のときのみ起動時同期を実行）
        if (flags.isEnabled('USE_SYNC_V2')) {
          console.log('[Sync] Startup sync initiated');
          const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
          await syncService.performStartupSync();
        }
      } catch (error) {
        console.error('[Critical] Startup tasks failed:', sanitizeForLog(error));
      }
    };

    runStartupTasks();
  }, [currentUser]);

  // 開発・テスト用の認証バイパス
  const isTestBypass = isTestBypassEnabled();

  // 認証状態がまだ解決していない場合はローディング画面を表示
  // ⚠ BrowserRouter を破棄せずにローディング表示することでルーティング状態を保護
  if (loading) {
    return <LoadingFallback />;
  }

  // ログインしていない & バイパスもない → ログイン画面に飛ばす
  if (!currentUser && !isTestBypass) {
    return <LoginPage />;
  }

  // test-only page for PDF wheel/trackpad scroll E2E checks
  if (PdfScrollTest && isTestBypass && window.location.pathname === '/pdf-scroll-test') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PdfScrollTest />
      </Suspense>
    );
  }

  if (CodeBlockVisualTest && isTestBypass && window.location.pathname === '/codeblock-visual-test') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CodeBlockVisualTest />
      </Suspense>
    );
  }

  // 通常時のアプリ本体
  return (
    <>
      {/* アカウントロックされている場合のブロック UI（内部で条件判定している想定） */}
      <AccountLockedScreen />

      {/* ルーティング定義 */}
      <Routes>
        {/* ルートパス "/" のレイアウト（ProtectedRoute でログインを強制） */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* "/" にアクセスされたら "/Dashboard" にリダイレクト（初回のみ） */}
          <Route index element={<DefaultRedirect />} />

          {/* ダッシュボード */}
          <Route
            path="Dashboard"
            element={
              <Suspense fallback={<DashboardSkeleton />}>
                <Dashboard />
              </Suspense>
            }
          />

          {/* フォルダ一覧 */}
          <Route
            path="folders"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Folders />
              </Suspense>
            }
          />

          {/* 以降はページごとのルート */}
          <Route path="CardEdit" element={<CardEdit />} />
          <Route path="CardView" element={<CardView />} />
          <Route path="study" element={<StudyMode />} />
          <Route path="calendar" element={<Calendar />} />

          {/* 今日の学習ページ */}
          <Route
            path="today-study"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <TodayStudy />
              </Suspense>
            }
          />

          {/* ギャラリーなど、重そうなページは Suspense でラップ */}
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
            path="diagnostics"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ImageDiagnostics />
              </Suspense>
            }
          />

          <Route
            path="create-mode/placeholder"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <NotImplementedPlaceholder />
              </Suspense>
            }
          />

          <Route
            path="one-qa-mode"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <OneQAMode />
              </Suspense>
            }
          />

          <Route
            path="pair-mode"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PairMode />
              </Suspense>
            }
          />

          <Route
            path="four-choice-mode"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <FourChoiceMode />
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

        {/* どのルートにもマッチしない場合はダッシュボードにリダイレクト */}
        <Route path="*" element={<Navigate to="/Dashboard" replace />} />
      </Routes>

      {/* 同期中であれば、右下に小さなステータスバナーを表示 */}
      {syncProgress && (
        <div className="fixed bottom-8 right-8 z-[9999] animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 min-w-[240px]">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-primary-600/10 rounded-full"></div>
              <div className="absolute top-0 left-0 w-10 h-10 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-primary-600 font-bold uppercase tracking-[0.2em] mb-0.5">
                Cloud Sync
              </p>
              {/* syncProgress に同期内容のテキストが入っている */}
              <p className="text-slate-600 text-xs font-bold truncate max-w-[160px]">
                {syncProgress}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ===== アプリ全体のルートコンポーネント =====
function App() {
  return (
    // 各種コンテキストでアプリ全体をラップし、どの子コンポーネントからも利用できるようにする
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          {/* ブラウザの URL に応じて画面を切り替えるための Router */}
          <BrowserRouter>
            {/* lazy で遅延読み込みしたページのローディング中に表示する UI の定義 */}
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
