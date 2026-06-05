import { useState, type CSSProperties } from "react";
import appIconSrc from "@shared/assets/icons/app-icon.svg";
import { signInWithGoogle } from "@/services/auth/googleSignIn";

type MobileLoginPageStyles = {
  page: CSSProperties;
  glowTop: CSSProperties;
  glowBottom: CSSProperties;
  card: CSSProperties;
  brandBlock: CSSProperties;
  logoIcon: CSSProperties;
  logoTitle: CSSProperties;
  tagline: CSSProperties;
  heading: CSSProperties;
  description: CSSProperties;
  button: CSSProperties;
  loadingDot: CSSProperties;
  divider: CSSProperties;
  line: CSSProperties;
  dividerText: CSSProperties;
  secureBox: CSSProperties;
  secureIcon: CSSProperties;
  secureText: CSSProperties;
};

const styles: MobileLoginPageStyles = {
  page: {
    position: "relative",
    minHeight: "100dvh",
    width: "100%",
    overflow: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "max(22px, env(safe-area-inset-top)) 18px max(30px, env(safe-area-inset-bottom))",
    boxSizing: "border-box",
    color: "#071947",
    background: "radial-gradient(circle at 0% 0%, rgba(125, 174, 255, 0.22), transparent 38%), radial-gradient(circle at 100% 100%, rgba(255, 178, 229, 0.28), transparent 40%), linear-gradient(145deg, #eef7ff 0%, #ffffff 52%, #fff3fb 100%)",
    fontFamily: "var(--app-font-family-ui), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  glowTop: {
    position: "fixed",
    top: "-150px",
    right: "-170px",
    width: "340px",
    height: "340px",
    borderRadius: "50%",
    background: "rgba(141, 180, 255, 0.2)",
    pointerEvents: "none",
  },
  glowBottom: {
    position: "fixed",
    left: "-160px",
    bottom: "-170px",
    width: "360px",
    height: "360px",
    borderRadius: "50%",
    background: "rgba(255, 185, 231, 0.24)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "min(100%, 390px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "30px 22px 28px",
    boxSizing: "border-box",
    borderRadius: "28px",
    border: "1px solid rgba(255, 255, 255, 0.9)",
    background: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 22px 58px rgba(61, 82, 121, 0.14)",
    backdropFilter: "blur(18px)",
  },
  brandBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  logoIcon: {
    display: "block",
    width: "86px",
    height: "86px",
    objectFit: "contain",
  },
  logoTitle: {
    margin: "10px 0 0",
    fontSize: "45px",
    lineHeight: 0.92,
    fontWeight: 900,
    letterSpacing: "-0.065em",
    color: "#061947",
  },
  tagline: {
    margin: "12px 0 0",
    fontSize: "14px",
    lineHeight: 1,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "#55637f",
  },
  heading: {
    margin: "30px 0 0",
    fontSize: "28px",
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    color: "#061947",
  },
  description: {
    margin: "12px 0 0",
    fontSize: "14px",
    lineHeight: 1.65,
    fontWeight: 600,
    textAlign: "center",
    letterSpacing: "0.02em",
    color: "#66728d",
  },
  button: {
    marginTop: "28px",
    width: "100%",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    borderRadius: "16px",
    border: "1px solid #d9deea",
    background: "#ffffff",
    color: "#061947",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
  },
  loadingDot: {
    width: "10px",
    height: "10px",
    borderRadius: 9999,
    background: "#8794ad",
  },
  divider: {
    width: "100%",
    marginTop: "24px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  line: {
    height: "1px",
    flex: 1,
    background: "#e3e8f0",
  },
  dividerText: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#7b88a3",
  },
  secureBox: {
    width: "100%",
    marginTop: "22px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    boxSizing: "border-box",
    borderRadius: "18px",
    background: "rgba(247, 249, 253, 0.92)",
    color: "#72809b",
  },
  secureIcon: {
    width: "30px",
    height: "30px",
    flexShrink: 0,
  },
  secureText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.55,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
};

const isAuthPopupClosedByUserError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "auth/popup-closed-by-user";

const GoogleIcon = () => (
  <svg style={{ width: 28, height: 28, flexShrink: 0 }} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.4-.2-2H12z" />
    <path fill="#34A853" d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.4-3.9l-3.3 2.5C5 19.9 8.2 22 12 22z" />
    <path fill="#FBBC05" d="M6.6 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L3.3 7.7C2.5 9.2 2 10.6 2 12.2s.5 3 1.3 4.5l3.3-2.5z" />
    <path fill="#4285F4" d="M12 6.2c1.4 0 2.7.5 3.6 1.4l2.7-2.7C16.7 3.4 14.5 2.4 12 2.4c-3.8 0-7 2.1-8.7 5.3l3.3 2.5c.8-2.3 2.9-4 5.4-4z" />
  </svg>
);

const ShieldIcon = () => (
  <svg style={styles.secureIcon} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 6.5 38 12v10.6c0 8.9-5.4 16.8-14 19.4-8.6-2.6-14-10.5-14-19.4V12l14-5.5Z" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
    <path d="m18.5 24.5 4.1 4.1 7.6-8.3" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MobileLoginPage = () => {
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
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <section style={styles.card}>
        <div style={styles.brandBlock}>
          <img src={appIconSrc} alt="Sivflow" style={styles.logoIcon} />
          <h1 style={styles.logoTitle}>Sivflow</h1>
          <p style={styles.tagline}>Write. Connect. Evolve.</p>
        </div>

        <h2 style={styles.heading}>ログイン</h2>
        <p style={styles.description}>
          思考をつなぎ、学びを進化させる
          <br />
          フラッシュカードプラットフォーム
        </p>

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

        <div style={styles.secureBox}>
          <ShieldIcon />
          <p style={styles.secureText}>ログインすると、データは安全に同期・バックアップされます。</p>
        </div>
      </section>
    </main>
  );
};

export { MobileLoginPage };
