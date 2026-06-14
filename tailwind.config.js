const appFontFamily = {
  ui: ["var(--app-font-family-ui)"],
  content: ["var(--app-font-family-content)"],
  numeric: ["var(--app-font-family-numeric)"],
  code: ["var(--app-font-family-code)"],
};

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./apps/web/index.html",
    "./apps/web/src/**/*.{js,ts,jsx,tsx}",
    "./packages/web-renderer/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./@/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        brand: {
          DEFAULT: "hsl(var(--foreground) / <alpha-value>)",
          foreground: "hsl(var(--background) / <alpha-value>)",
        },
        highlight: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--ds-color-neutral-900-rgb) / <alpha-value>)",
          50: "rgb(var(--ds-color-neutral-50-rgb) / <alpha-value>)",
          100: "rgb(var(--ds-color-neutral-100-rgb) / <alpha-value>)",
          200: "rgb(var(--ds-color-neutral-200-rgb) / <alpha-value>)",
          300: "rgb(var(--ds-color-neutral-300-rgb) / <alpha-value>)",
          400: "rgb(var(--ds-color-neutral-400-rgb) / <alpha-value>)",
          500: "rgb(var(--ds-color-neutral-500-rgb) / <alpha-value>)",
          600: "rgb(var(--ds-color-neutral-600-rgb) / <alpha-value>)",
          700: "rgb(var(--ds-color-neutral-700-rgb) / <alpha-value>)",
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
          DEFAULT: "hsl(var(--background) / <alpha-value>)",
          light: "rgb(var(--ds-semantic-color-background-app-rgb) / <alpha-value>)",
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
          "linear-gradient(135deg, var(--ds-color-neutral-800) 0%, var(--ds-color-neutral-500) 100%)",
        "gradient-secondary":
          "linear-gradient(135deg, var(--ds-color-neutral-700) 0%, var(--ds-color-neutral-900) 100%)",
        "gradient-accent":
          "linear-gradient(135deg, var(--ds-color-status-warning) 0%, var(--ds-color-status-danger) 100%)",
        "gradient-purple":
          "linear-gradient(135deg, var(--ds-color-tag-purple-border) 0%, var(--ds-color-tag-purple-fg) 100%)",
        "gradient-warm":
          "linear-gradient(135deg, var(--ds-semantic-color-background-app) 0%, var(--ds-color-neutral-100) 100%)",
        "gradient-hero":
          "linear-gradient(135deg, var(--ds-color-neutral-800) 0%, var(--ds-color-neutral-500) 50%, var(--ds-color-status-warning) 100%)",
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

export default config;
