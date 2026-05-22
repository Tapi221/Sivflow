import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
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
    plugins: {
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
      "@stylistic": stylistic,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // ----------------------------
      // stylistic（現実運用寄りに緩和）
      // ----------------------------
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "always"],

      "@stylistic/max-len": [
        "warn",
        {
          code: 160,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreComments: true,
        },
      ],

      // ----------------------------
      // import制約
      // ----------------------------
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/types/branded",
              message: "Use '@/types/core/branded' instead.",
            },
            {
              name: "@/utils",
              message:
                "Do not add new imports from '@/utils'. Use domain/shared modules instead.",
            },
          ],
          patterns: [
            {
              group: [
                "../*",
                "../../*",
                "../../../*",
                "../../../../*",
                "../../../../../*",
              ],
              message: "Use @/ alias for cross-folder imports inside src.",
            },
          ],
        },
      ],

      // ----------------------------
      // react hooks（warning化で崩壊防止）
      // ----------------------------
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // ----------------------------
      // unused imports
      // ----------------------------
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // ----------------------------
      // import sort
      // ----------------------------
      "simple-import-sort/imports": "off",
      "simple-import-sort/exports": "off",
    },
  },

  {
    files: [
      "src/features/calendar/grid/Grid.calendar.month.desktop.tsx",
      "src/features/calendar/task/TaskBoardView.tsx",
    ],
    rules: {
      "@stylistic/indent": "off",
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/domain/card/selectors/cardFolder.ts",
      "src/services/legacyCardSetMigrationBackfill.ts",
      "src/services/SyncServiceV2.ts",
      "src/services/localdb/schema.ts",
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "card",
          property: "folderId",
          message: "Do not read card.folderId directly. Use resolver.",
        },
      ],
    },
  },

  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/layout/**/*.{ts,tsx}",
      "src/routes/**/*.{ts,tsx}",
      "src/ui/**/*.{ts,tsx}",
      "src/presentation/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infrastructure/*", "@/infrastructure/**"],
              message: "UI layer must not import infrastructure.",
            },
            {
              group: ["@/platform/desktop/*", "@/platform/desktop/**"],
              message: "UI layer must not import desktop bridge.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/**",
                "@/layout/**",
                "@/routes/**",
                "@/ui/**",
                "@/presentation/**",
              ],
              message: "Application layer must not import UI modules.",
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
      "functions/**/*.{ts,tsx}",
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      "simple-import-sort/imports": "off",
      "simple-import-sort/exports": "off",
    },
  },
]);