/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // メインカラー（ティールグリーン系）
        primary: {
          DEFAULT: "var(--color-primary-500)", // Default to 500
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)", // Main accent with opacity support
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },
        // ニュートラル（グレー）
        neutral: {
          DEFAULT: "#8B8B8B",
          100: "#F5F5F5",
          200: "#E0E0E0",
          300: "#C6C6C6",
          400: "#A0A0A0",
          500: "#8B8B8B",
          600: "#757575",
          700: "#616161",
        },
        // 背景
        background: {
          DEFAULT: "#FFFFFF",
          light: "#FFFFFF",
          subtle: "#F5F5F5",
        },
        // テキスト
        text: {
          DEFAULT: "#2C2C2C",
          strong: "#2C2C2C",
          body: "#4A4A4A",
          weak: "#8B8B8B",
        },
      },
      fontFamily: {
        sans: [
          '"Zen Kaku Gothic New"',
          '"Noto Sans JP"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #689A98 0%, #90B8B6 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)",
        "gradient-accent": "linear-gradient(135deg, #FFE66D 0%, #FFB347 100%)",
        "gradient-purple": "linear-gradient(135deg, #A78BFA 0%, #EC4899 100%)",
        "gradient-warm": "linear-gradient(135deg, #FFF8F5 0%, #E6F0EF 100%)",
        "gradient-hero":
          "linear-gradient(135deg, #689A98 0%, #90B8B6 50%, #FFE66D 100%)",
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(104, 154, 152, 0.15), 0 10px 20px -2px rgba(104, 154, 152, 0.08)",
        glow: "0 0 20px rgba(104, 154, 152, 0.3)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 8px -2px rgba(0, 0, 0, 0.04)",
        "card-hover":
          "0 8px 30px -4px rgba(104, 154, 152, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        gradient: "gradient 8s ease infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};
