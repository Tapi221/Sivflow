import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";
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
    plugins: {
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
    },
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
            {
              name: "@/utils",
              message:
                "Do not add new imports from '@/utils'. Import from the owned domain/shared/platform module instead. '@/utils' is temporary compatibility only.",
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
              message:
                "Cross-folder imports inside src must use @/ alias. Use relative paths only for same-folder imports like './x'.",
            },
          ],
        },
      ],

      // React Compiler / hooks: keep signal, avoid CI-stopping errors for legacy code.
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // 未使用importは自動削除対象
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",

      // import以外の未使用変数は警告だけ残す
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
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
          message:
            "Do not read card.folderId directly. Resolve via cardSetId + resolveCardFolderId.",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='card'][property.name='folderId']",
          message:
            "Do not read card.folderId directly. Resolve via cardSetId + resolveCardFolderId.",
        },
      ],
    },
  },

  // Guardrails: enforce stable dependency direction (UI -> application/platform, not infrastructure/electron).
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
              message:
                "UI layer must not import infrastructure directly. Depend on application ports/use-cases or platform abstractions instead.",
            },
            {
              group: ["@/platform/desktop/*", "@/platform/desktop/**"],
              message:
                "UI layer must not import desktop bridge details. Use '@/platform' or '@/platform/runtime' instead.",
            },
          ],
        },
      ],
    },
  },

  // Guardrails: application must not depend on UI (prevents reverse dependencies).
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/*",
                "@/components/**",
                "@/layout/*",
                "@/layout/**",
                "@/routes/*",
                "@/routes/**",
                "@/ui/*",
                "@/ui/**",
                "@/presentation/*",
                "@/presentation/**",
              ],
              message:
                "Application layer must not import UI modules. Move UI concerns to presentation/adapters and depend on application ports/use-cases instead.",
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
    },
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
            {
              name: "@/utils",
              message:
                "Do not add new imports from '@/utils'. Import from the owned domain/shared/platform module instead. '@/utils' is temporary compatibility only.",
            },
          ],
        },
      ],

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
    },
  },
]);
