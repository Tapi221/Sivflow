import { useState, type CSSProperties } from "react";
import { signInWithGoogle } from "@/services/auth/googleSignIn";

type ViewportStyle = {
  page: CSSProperties;
  glowLeft: CSSProperties;
  glowRight: CSSProperties;
  card: CSSProperties;
  leftPanel: CSSProperties;
  waveOne: CSSProperties;
  waveTwo: CSSProperties;
  brandBlock: CSSProperties;
  logoTitle: CSSProperties;
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
};

const styles: ViewportStyle = {
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
    background: "radial-gradient(circle at 0% 100%, rgba(125, 174, 255, 0.28), transparent 36%), radial-gradient(circle at 100% 100%, rgba(255, 178, 229, 0.3), transparent 38%), linear-gradient(116deg, #eef7ff 0%, #ffffff 48%, #fff3fb 100%)",
    fontFamily: "var(--app-font-family-ui), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  glowLeft: {
    position: "absolute",
    left: "-120px",
    bottom: "-120px",
    width: "720px",
    height: "520px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(104, 160, 255, 0.22), rgba(183, 164, 255, 0.18), transparent 70%)",
    transform: "rotate(-15deg)",
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    right: "-120px",
    bottom: "-130px",
    width: "700px",
    height: "500px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, transparent 22%, rgba(255, 190, 232, 0.24), rgba(255, 225, 246, 0.38))",
    transform: "rotate(15deg)",
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
    borderRadius: "28px",
    border: "1px solid rgba(255, 255, 255, 0.88)",
    background: "rgba(255, 255, 255, 0.86)",
    boxShadow: "0 28px 80px rgba(61, 82, 121, 0.14)",
    backdropFilter: "blur(18px)",
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
    borderRight: "1px solid rgba(221, 227, 238, 0.78)",
    background: "linear-gradient(180deg, rgba(250, 251, 255, 0.94), rgba(248, 247, 253, 0.95))",
  },
  waveOne: {
    position: "absolute",
    left: "-82px",
    bottom: "-78px",
    width: "780px",
    height: "330px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, rgba(116, 174, 255, 0.22), rgba(180, 160, 255, 0.18), transparent 72%)",
    transform: "rotate(-12deg)",
  },
  waveTwo: {
    position: "absolute",
    left: "-20px",
    bottom: "-128px",
    width: "760px",
    height: "310px",
    borderRadius: "50%",
    borderTop: "1px solid rgba(255, 255, 255, 0.78)",
    background: "linear-gradient(135deg, rgba(130, 197, 255, 0.18), rgba(221, 207, 255, 0.22), transparent 72%)",
    transform: "rotate(-6deg)",
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
  logoTitle: {
    margin: "6px 0 0",
    fontSize: "84px",
    lineHeight: 0.92,
    fontWeight: 900,
    letterSpacing: "-0.065em",
    color: "#061947",
  },
  tagline: {
    margin: "18px 0 0",
    fontSize: "25px",
    lineHeight: 1,
    fontWeight: 500,
    letterSpacing: "0.02em",
    color: "#55637f",
  },
  description: {
    margin: "34px 0 0",
    fontSize: "23px",
    lineHeight: 1.7,
    fontWeight: 500,
    letterSpacing: "0.02em",
    color: "#66728d",
  },
  rightPanel: {
    minHeight: "820px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "56px 48px",
    boxSizing: "border-box",
    background: "rgba(255, 255, 255, 0.88)",
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
    borderRadius: "14px",
    border: "1px solid #d9deea",
    background: "#ffffff",
    color: "#061947",
    fontSize: "28px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 9px 24px rgba(15, 23, 42, 0.12)",
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
    background: "#e3e8f0",
  },
  dividerText: {
    fontSize: "21px",
    fontWeight: 500,
    color: "#7b88a3",
  },
  secureRow: {
    width: "100%",
    marginTop: "58px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "30px",
    color: "#72809b",
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
    background: "#dfe4ec",
  },
  startRow: {
    width: "100%",
    marginTop: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "22px",
    color: "#72809b",
  },
  startText: {
    margin: 0,
    fontSize: "21px",
    lineHeight: 1.6,
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
};

const isAuthPopupClosedByUserError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "auth/popup-closed-by-user";

const SivflowMark = () => (
  <svg style={{ width: 250, height: 250, display: "block" }} viewBox="0 0 220 220" role="img" aria-label="Sivflow">
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
  <svg style={{ width: 28, height: 28, color: "#5b9cff", flexShrink: 0 }} viewBox="0 0 32 32" fill="none" aria-hidden="true">
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
      <div style={styles.glowLeft} />
      <div style={styles.glowRight} />

      <section style={styles.card}>
        <div style={styles.leftPanel}>
          <div style={styles.waveOne} />
          <div style={styles.waveTwo} />

          <div style={styles.brandBlock}>
            <SivflowMark />
            <h1 style={styles.logoTitle}>Sivflow</h1>
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
                  <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#8794ad" }} />
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
