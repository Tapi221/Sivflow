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
      "@stylistic/indent": ["warn", 2],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/max-len": "off",
      "@stylistic/object-curly-newline": [
        "warn",
        {
          ImportDeclaration: "never",
          ExportDeclaration: "never",
        },
      ],
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
              message: "Do not add new imports from '@/utils'. Use domain/shared modules instead.",
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
            {
              group: ["./*/**"],
              message: "Use @/ alias for child-folder imports inside src. Same-directory imports may use ./.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: String.raw`ImportDeclaration[source.value=/^\.\.\//]`,
          message: "Use @/ alias for cross-folder imports inside src.",
        },
        {
          selector: String.raw`ExportNamedDeclaration[source.value=/^\.\.\//]`,
          message: "Use @/ alias for cross-folder exports inside src.",
        },
        {
          selector: String.raw`ExportAllDeclaration[source.value=/^\.\.\//]`,
          message: "Use @/ alias for cross-folder exports inside src.",
        },
        {
          selector: String.raw`ImportDeclaration[source.value=/^\.\/[^/]+\//]`,
          message: "Use @/ alias for child-folder imports inside src. Same-directory imports may use ./.",
        },
        {
          selector: String.raw`ExportNamedDeclaration[source.value=/^\.\/[^/]+\//]`,
          message: "Use @/ alias for child-folder exports inside src. Same-directory exports may use ./.",
        },
        {
          selector: String.raw`ExportAllDeclaration[source.value=/^\.\/[^/]+\//]`,
          message: "Use @/ alias for child-folder exports inside src. Same-directory exports may use ./.",
        },
      ],
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
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

  {
    files: ["src/components/folder/components/views/FolderTreeWithCards.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^(?:_|fileInputRef|currentFileAccept|handleToolbarFileInputChange|handleCreateCardSetFromRootPanel)$",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["src/features/calendar/grid/Grid.calendar.month.desktop.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },

  {
    files: ["src/chip/rightclickpanel.desktop/ProjectCalendarLinksMenu.desktop.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  {
    files: ["src/features/calendar/grid/Grid.calendar.weekday.desktop.tsx"],
    rules: {
      "unused-imports/no-unused-imports": "off",
    },
  },

  {
    files: [
      "src/features/calendar/googlecalendar-integration/gcal.oauth.ts",
      "src/integration/google-integration/google.oauth.ts",
      "src/integration/googlecalendar-integration/gcal.oauth.ts",
    ],
    rules: {
      "prefer-const": "off",
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
      "functions/**/*.{ts,tsx}",
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: {
      "@stylistic": stylistic,
      "unused-imports": unusedImports,
    },
    rules: {
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }],
    },
  },
]);
