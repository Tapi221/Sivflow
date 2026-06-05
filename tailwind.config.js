/** @type {import('tailwindcss').Config} */
const appFontFamily = {
  ui: ["var(--app-font-family-ui)"],
  content: ["var(--app-font-family-content)"],
  numeric: ["var(--app-font-family-numeric)"],
  code: ["var(--app-font-family-code)"],
};

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border:
          "rgb(var(--ds-semantic-color-border-default-rgb) / <alpha-value>)",
        input:
          "rgb(var(--ds-semantic-color-border-default-rgb) / <alpha-value>)",
        ring: "rgb(var(--ds-semantic-color-action-primary-rgb) / <alpha-value>)",
        foreground:
          "rgb(var(--ds-semantic-color-text-primary-rgb) / <alpha-value>)",
        popover: {
          DEFAULT:
            "rgb(var(--ds-semantic-color-background-app-rgb) / <alpha-value>)",
          foreground:
            "rgb(var(--ds-semantic-color-text-primary-rgb) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--ds-color-neutral-100-rgb) / <alpha-value>)",
          foreground:
            "rgb(var(--ds-semantic-color-text-secondary-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT:
            "rgb(var(--ds-semantic-color-background-sidebar-active-rgb) / <alpha-value>)",
          foreground:
            "rgb(var(--ds-semantic-color-text-strong-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:
            "rgb(var(--ds-semantic-color-action-primary-soft-rgb) / <alpha-value>)",
          foreground:
            "rgb(var(--ds-semantic-color-action-primary-rgb) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--ds-color-status-danger-rgb) / <alpha-value>)",
          foreground:
            "rgb(var(--ds-semantic-color-text-on-primary-rgb) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--ds-color-primary-500-rgb) / <alpha-value>)",
          50: "rgb(var(--ds-color-primary-50-rgb) / <alpha-value>)",
          100: "rgb(var(--ds-color-primary-100-rgb) / <alpha-value>)",
          200: "rgb(var(--ds-color-primary-200-rgb) / <alpha-value>)",
          300: "rgb(var(--ds-color-primary-300-rgb) / <alpha-value>)",
          400: "rgb(var(--ds-color-primary-400-rgb) / <alpha-value>)",
          500: "rgb(var(--ds-color-primary-500-rgb) / <alpha-value>)",
          600: "rgb(var(--ds-color-primary-600-rgb) / <alpha-value>)",
          700: "rgb(var(--ds-color-primary-700-rgb) / <alpha-value>)",
        },
        neutral: {
          DEFAULT: "rgb(var(--ds-color-neutral-500-rgb) / <alpha-value>)",
          0: "rgb(var(--ds-color-neutral-0-rgb) / <alpha-value>)",
          50: "rgb(var(--ds-color-neutral-50-rgb) / <alpha-value>)",
          100: "rgb(var(--ds-color-neutral-100-rgb) / <alpha-value>)",
          150: "rgb(var(--ds-color-neutral-150-rgb) / <alpha-value>)",
          200: "rgb(var(--ds-color-neutral-200-rgb) / <alpha-value>)",
          300: "rgb(var(--ds-color-neutral-300-rgb) / <alpha-value>)",
          400: "rgb(var(--ds-color-neutral-400-rgb) / <alpha-value>)",
          500: "rgb(var(--ds-color-neutral-500-rgb) / <alpha-value>)",
          600: "rgb(var(--ds-color-neutral-600-rgb) / <alpha-value>)",
          700: "rgb(var(--ds-color-neutral-700-rgb) / <alpha-value>)",
          800: "rgb(var(--ds-color-neutral-800-rgb) / <alpha-value>)",
          900: "rgb(var(--ds-color-neutral-900-rgb) / <alpha-value>)",
        },
        background: {
          DEFAULT:
            "rgb(var(--ds-semantic-color-background-app-rgb) / <alpha-value>)",
          light:
            "rgb(var(--ds-semantic-color-background-app-rgb) / <alpha-value>)",
          subtle: "rgb(var(--ds-color-neutral-100-rgb) / <alpha-value>)",
        },
        text: {
          DEFAULT:
            "rgb(var(--ds-semantic-color-text-primary-rgb) / <alpha-value>)",
          strong:
            "rgb(var(--ds-semantic-color-text-strong-rgb) / <alpha-value>)",
          body: "rgb(var(--ds-semantic-color-text-secondary-rgb) / <alpha-value>)",
          weak: "rgb(var(--ds-color-neutral-500-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: appFontFamily.ui,
        serif: appFontFamily.content,
        mono: appFontFamily.code,
        numeric: appFontFamily.numeric,
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, var(--ds-color-primary-600) 0%, var(--ds-color-primary-400) 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, var(--ds-color-primary-500) 0%, var(--ds-color-primary-700) 100%)",
        "gradient-accent":
          "linear-gradient(135deg, var(--ds-color-status-warning) 0%, var(--ds-color-status-danger) 100%)",
        "gradient-purple":
          "linear-gradient(135deg, var(--ds-color-tag-purple-border) 0%, var(--ds-color-tag-purple-fg) 100%)",
        "gradient-warm":
          "linear-gradient(135deg, var(--ds-semantic-color-background-app) 0%, var(--ds-semantic-color-action-primary-soft) 100%)",
        "gradient-hero":
          "linear-gradient(135deg, var(--ds-color-primary-600) 0%, var(--ds-color-primary-400) 50%, var(--ds-color-status-warning) 100%)",
      },
      boxShadow: {
        soft: "var(--ds-elevation-shadow-soft)",
        card: "var(--ds-elevation-shadow-card)",
        "card-hover": "var(--ds-elevation-shadow-card-hover)",
      },
      borderRadius: {
        "2xl": "var(--ds-radius-xl)",
        "3xl": "var(--ds-radius-2xl)",
        "4xl": "var(--ds-radius-3xl)",
      },
      transitionDuration: {
        DEFAULT: "0ms",
        150: "0ms",
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