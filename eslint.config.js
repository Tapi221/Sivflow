import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),

  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/types/branded",
              message: "Use '@/types/core/branded' instead.",
            },
          ],
          patterns: [
            {
              group: ["../*", "../../*", "../../../*", "../../../../*", "../../../../../*"],
              message: "Cross-folder imports inside src must use @/ alias. Use relative paths only for same-folder imports like './x'.",
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "tests/**/*.{ts,tsx}",
      "scripts/**/*.{ts,tsx}",
      "electron/**/*.{ts,tsx}",
      "functions/**/*.{ts,tsx}"
    ],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/types/branded",
              message: "Use '@/types/core/branded' instead.",
            },
          ],
        },
      ],
    },
  },
]);


