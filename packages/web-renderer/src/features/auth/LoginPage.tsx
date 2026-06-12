import { useState } from "react";
import authBackgroundSrc from "@shared/assets/backgrounds/sivflow-flow-background.svg";
import appIconSrc from "@shared/assets/icons/app-icon.svg";
import type { CSSProperties } from "react";
import { signInWithGoogle } from "@/services/auth/googleSignIn";

type LoginPageStyles = {
  page: CSSProperties;
  backgroundOverlay: CSSProperties;
  card: CSSProperties;
  leftPanel: CSSProperties;
  brandBlock: CSSProperties;
  logoIcon: CSSProperties;
  tagline: CSSProperties;
  description: CSSProperties;
  rightPanel: CSSProperties;
  form: CSSProperties;
  heading: CSSProperties;
  button: CSSProperties;
  divider: CSSProperties;
  line: CSSProperties;
  dividerText: CSSProperties;
  secureRow: CSSProperties;
  secureText: CSSProperties;
  bottomLine: CSSProperties;
  startRow: CSSProperties;
  startText: CSSProperties;
  loadingDot: CSSProperties;
};

const styles: LoginPageStyles = {
  page: {
    position: "relative",
    minHeight: "100dvh",
    width: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 52px",
    boxSizing: "border-box",
    color: "#071947",
    backgroundImage: `url(${authBackgroundSrc})`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    fontFamily: "var(--app-font-family-ui), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  backgroundOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, rgba(244, 250, 255, 0.42) 0%, rgba(255, 255, 255, 0.2) 45%, rgba(255, 255, 255, 0.7) 100%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1430px",
    minHeight: "820px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    overflow: "hidden",
    borderRadius: "30px",
    border: "1px solid rgba(255, 255, 255, 0.58)",
    background: "rgba(255, 255, 255, 0.38)",
    boxShadow: "0 34px 90px rgba(6, 25, 71, 0.2)",
    backdropFilter: "blur(20px) saturate(1.12)",
  },
  leftPanel: {
    position: "relative",
    overflow: "hidden",
    minHeight: "820px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "56px 48px",
    boxSizing: "border-box",
    borderRight: "1px solid rgba(255, 255, 255, 0.44)",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(236, 248, 255, 0.2))",
  },
  brandBlock: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    maxWidth: "540px",
  },
  logoIcon: {
    display: "block",
    width: "320px",
    height: "320px",
    objectFit: "contain",
    filter: "drop-shadow(0 18px 34px rgba(5, 27, 52, 0.18))",
  },
  tagline: {
    margin: "22px 0 0",
    fontSize: "25px",
    lineHeight: 1,
    fontWeight: 500,
    letterSpacing: "0.02em",
    color: "#43516a",
  },
  description: {
    margin: "34px 0 0",
    fontSize: "23px",
    lineHeight: 1.7,
    fontWeight: 500,
    letterSpacing: "0.02em",
    color: "#50607a",
  },
  rightPanel: {
    minHeight: "820px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "56px 48px",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.58)",
  },
  form: {
    width: "100%",
    maxWidth: "510px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  heading: {
    margin: 0,
    fontSize: "58px",
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#061947",
  },
  button: {
    marginTop: "72px",
    width: "100%",
    height: "76px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "22px",
    borderRadius: "16px",
    border: "1px solid rgba(197, 211, 227, 0.82)",
    background: "rgba(255, 255, 255, 0.86)",
    color: "#061947",
    fontSize: "28px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 36px rgba(15, 23, 42, 0.13)",
  },
  divider: {
    width: "100%",
    marginTop: "62px",
    display: "flex",
    alignItems: "center",
    gap: "28px",
  },
  line: {
    height: "1px",
    flex: 1,
    background: "rgba(163, 179, 201, 0.5)",
  },
  dividerText: {
    fontSize: "21px",
    fontWeight: 500,
    color: "#6b7892",
  },
  secureRow: {
    width: "100%",
    marginTop: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "30px",
    color: "#66758f",
  },
  secureText: {
    margin: 0,
    fontSize: "22px",
    lineHeight: 1.65,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  bottomLine: {
    width: "100%",
    height: "1px",
    marginTop: "94px",
    background: "rgba(163, 179, 201, 0.46)",
  },
  startRow: {
    width: "100%",
    marginTop: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "22px",
    color: "#66758f",
  },
  startText: {
    margin: 0,
    fontSize: "21px",
    lineHeight: 1.6,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 9999,
    background: "#8794ad",
  },
};

const isAuthPopupClosedByUserError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "auth/popup-closed-by-user";

const GoogleIcon = () => (
  <svg style={{ width: 38, height: 38, flexShrink: 0 }} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2H12z" />
    <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.3 2.5C5 19.9 8.2 22 12 22z" />
    <path fill="#FBBC05" d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.7C2.5 9.2 2 10.6 2 12.2s.5 3 1.3 4.5l3.3-2.5z" />
    <path fill="#4285F4" d="M12 6.2c1.4 0 2.7.5 3.6 1.4l2.7-2.7C16.7 3.4 14.5 2.4 12 2.4c-3.8 0-7 2.1-8.7 5.3l3.3 2.5c.8-2.3 2.9-4 5.4-4z" />
  </svg>
);
const ShieldIcon = () => (
  <svg style={{ width: 48, height: 48, flexShrink: 0 }} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 6.5 38 12v10.6c0 8.9-5.4 16.8-14 19.4-8.6-2.6-14-10.5-14-19.4V12l14-5.5Z" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
    <path d="m18.5 24.5 4.1 4.1 7.6-8.3" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SparkleIcon = () => (
  <svg style={{ width: 28, height: 28, color: "#4a9dff", flexShrink: 0 }} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 4.5c.4 4.3 1.4 6.8 2.8 8.2 1.4 1.4 3.9 2.4 8.2 2.8-4.3.4-6.8 1.4-8.2 2.8-1.4 1.4-2.4 3.9-2.8 8.2-.4-4.3-1.4-6.8-2.8-8.2-1.4-1.4-3.9-2.4-8.2-2.8 4.3-.4 6.8-1.4 8.2-2.8 1.4-1.4 2.4-3.9 2.8-8.2Z" fill="currentColor" />
    <path d="M25.5 5.5c.2 2.1.7 3.3 1.4 4 .7.7 1.9 1.2 4 1.4-2.1.2-3.3.7-4 1.4-.7.7-1.2 1.9-1.4 4-.2-2.1-.7-3.3-1.4-4-.7-.7-1.9-1.2-4-1.4 2.1-.2 3.3-.7 4-1.4.7-.7 1.2-1.9 1.4-4Z" fill="currentColor" opacity="0.7" />
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
    <main style={styles.page}>
      <div style={styles.backgroundOverlay} />
      <section style={styles.card}>
        <div style={styles.leftPanel}>
          <div style={styles.brandBlock}>
            <img src={appIconSrc} alt="Sivflow" style={styles.logoIcon} />
            <p style={styles.tagline}>Write. Connect. Evolve.</p>
            <p style={styles.description}>
              思考をつなぎ、学びを進化させる
              <br />
              次世代フラッシュカードプラットフォーム
            </p>
          </div>
        </div>
        <div style={styles.rightPanel}>
          <div style={styles.form}>
            <h2 style={styles.heading}>ログイン</h2>
            <button type="button" onClick={handleGoogleLogin} disabled={isLoading} style={{ ...styles.button, opacity: isLoading ? 0.64 : 1 }}>
              {isLoading ? (
                <>
                  <span style={styles.loadingDot} />
                  ログイン中...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Google でログイン
                </>
              )}
            </button>
            <div style={styles.divider}>
              <div style={styles.line} />
              <span style={styles.dividerText}>または</span>
              <div style={styles.line} />
            </div>
            <div style={styles.secureRow}>
              <ShieldIcon />
              <p style={styles.secureText}>
                ログインすると、あなたのデータは
                <br />
                安全に同期・バックアップされます。
              </p>
            </div>
            <div style={styles.bottomLine} />
            <div style={styles.startRow}>
              <SparkleIcon />
              <p style={styles.startText}>初めての方も、Googleでそのまま開始できます</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export { LoginPage };
