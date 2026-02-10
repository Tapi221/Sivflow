// ルーティングに必要なコンポーネント・フックを react-router-dom から読み込み
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// React 本体からサスペンス（遅延読み込み用）、lazy（動的 import）、状態管理・副作用フック
import { Suspense, lazy, useState, useEffect } from 'react';
// 認証状態をアプリ全体に配るコンテキスト
import { AuthProvider } from './contexts/AuthContext';
// テーマ（ライト/ダークなど）を配るコンテキスト
import { ThemeProvider } from './contexts/ThemeContext';
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
const Statistics = lazy(() => import('./Pages/Statistics'));
const Folders = lazy(() => import('./Pages/Folders'));
const FolderView = lazy(() => import('./Pages/FolderView'));
const CardEdit = lazy(() => import('./Pages/CardEdit'));
const CardView = lazy(() => import('./Pages/CardView'));
const StudyMode = lazy(() => import('./Pages/StudyMode'));
const Trash = lazy(() => import('./Pages/Trash'));
const UncertainMode = lazy(() => import('./Pages/UncertainMode'));
const BookmarkMode = lazy(() => import('./Pages/BookmarkMode'));
const SyncSettings = lazy(() => import('./Pages/SyncSettings'));
const ImageDiagnostics = lazy(() => import('./Pages/ImageDiagnostics'));
const Gallery = lazy(() => import('./Pages/Gallery'));
const WorldMap = lazy(() => import('./Pages/WorldMap'));
const NotImplementedPlaceholder = lazy(() => import('./Pages/NotImplementedPlaceholder'));
const OneQAMode = lazy(() => import('./Pages/OneQAMode'));
const PairMode = lazy(() => import('./Pages/PairMode'));
const FourChoiceMode = lazy(() => import('./Pages/FourChoiceMode'));
const PdfScrollTest = DEV_MODE
  ? lazy(() => import('./Pages/PdfScrollTest'))
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] animate-in fade-in duration-500">
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
    } catch (error: any) {
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
    // ログインフォームのレイアウト（画面中央に白いカード）
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Flash Master</h1>
        <p className="text-gray-600 mb-8">
          manifolmiaへようこそ。ログインしてください。
        </p>
        {/* Google ログインボタン */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            // ログイン処理中のインジケータ
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ログイン中...
            </>
          ) : (
            // 通常時のボタン表示（Google のアイコン付き）
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleでログイン
            </>
          )}
        </button>
      </div>
    </div>
  );
}


// ===== アプリ本体のルーティング・起動処理をまとめたコンポーネント =====
function AppContent() {
  const { currentUser } = useAuth();
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
          console.error(
            '[Critical] Data integrity issues found:',
            report.issues.length,
            report.issues,
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
        console.error('[Critical] Startup tasks failed:', error);
      }
    };

    runStartupTasks();
  }, [currentUser]);

  // 開発・テスト用の認証バイパス
  const isTestBypass = isTestBypassEnabled();

  // ログインしていない & バイパスもない → ログイン画面に飛ばす
  if (!currentUser && !isTestBypass) {
    return <LoginPage />;
  }

  // バイパス中かつ URL が /sync-settings のときは、同期設定ページだけ単体表示（テスト用）
  if (isTestBypass && window.location.pathname === '/sync-settings') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SyncSettings />
      </Suspense>
    );
  }

  // test-only page for PDF wheel/trackpad scroll E2E checks
  if (PdfScrollTest && isTestBypass && window.location.pathname === '/pdf-scroll-test') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PdfScrollTest />
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
          {/* "/" にアクセスされたら "/Dashboard" にリダイレクト */}
          <Route index element={<Navigate to="/Dashboard" replace />} />

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
          <Route path="FolderView" element={<FolderView />} />
          <Route path="CardEdit" element={<CardEdit />} />
          <Route path="CardView" element={<CardView />} />
          <Route path="study" element={<StudyMode />} />
          <Route path="uncertain" element={<UncertainMode />} />
          <Route path="bookmark" element={<BookmarkMode />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="statistics" element={<Statistics />} />

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
            path="sync-settings"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <SyncSettings />
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

          <Route
            path="WorldMap"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <WorldMap />
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
        </Route>

        {/* どのルートにもマッチしない場合は "/" にリダイレクト */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
      <ThemeProvider>
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
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
