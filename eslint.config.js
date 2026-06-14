import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

const TYPESCRIPT_SOURCE_FILES = ["src/**/*.{ts,tsx}", "apps/web/src/**/*.{ts,tsx}", "apps/android/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"];
const UI_SOURCE_FILES = ["src/components/**/*.{ts,tsx}", "src/layout/**/*.{ts,tsx}", "src/routes/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}", "src/presentation/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "packages/web-renderer/src/**/*.{ts,tsx}", "packages/android-renderer/src/**/*.{ts,tsx}"];
const APPLICATION_SOURCE_FILES = ["src/application/**/*.{ts,tsx}"];
const IMPORT_PATH_RESTRICTED_PATHS = [
  {
    name: "@/types/branded",
    message: "Use '@/types/core/branded' instead.",
  },
  {
    name: "@/utils",
    message: "Do not add new imports from '@/utils'. Use domain/shared modules instead.",
  },
  {
    name: "@constants",
    message: "Do not import from @constants. Move values to their responsibility module.",
  },
];
const IMPORT_PATH_RESTRICTED_PATTERNS = [
  {
    group: ["../*", "../../*", "../../../*", "../../../../*", "../../../../../*"],
    message: "Use an alias for cross-folder imports. Same-directory imports may use ./.",
  },
  {
    group: ["./*/**"],
    message: "Use an alias for child-folder imports. Same-directory imports may use ./.",
  },
  {
    group: ["@constants/*", "@constants/**"],
    message: "Do not import from @constants. Move values to their responsibility module.",
  },
];
const UI_RESTRICTED_IMPORT_PATTERNS = [
  ...IMPORT_PATH_RESTRICTED_PATTERNS,
  {
    group: ["@/infrastructure/*", "@/infrastructure/**"],
    message: "UI layer must not import infrastructure.",
  },
  {
    group: ["@/platform/desktop/*", "@/platform/desktop/**"],
    message: "UI layer must not import desktop bridge.",
  },
];
const SIMPLE_IMPORT_SORT_GROUPS = [
  [String.raw`^\x00`, "^react$", "^react-dom$", "^react/", "^react-dom/", "^@?\\w", "^@/", String.raw`^\.`],
];
const COMMA_DANGLE_STYLE = {
  arrays: "always-multiline",
  objects: "always-multiline",
  imports: "always-multiline",
  exports: "always-multiline",
  functions: "always-multiline",
  enums: "always-multiline",
  generics: "ignore",
  tuples: "always-multiline",
};
const STYLISTIC_FIXABLE_RULES = {
  "@stylistic/array-bracket-spacing": ["warn", "never"],
  "@stylistic/arrow-spacing": "warn",
  "@stylistic/block-spacing": ["warn", "always"],
  "@stylistic/comma-dangle": ["error", COMMA_DANGLE_STYLE],
  "@stylistic/comma-spacing": "warn",
  "@stylistic/computed-property-spacing": ["warn", "never"],
  "@stylistic/function-call-spacing": "warn",
  "@stylistic/indent": ["warn", 2, { SwitchCase: 1 }],
  "@stylistic/jsx-closing-bracket-location": ["warn", "line-aligned"],
  "@stylistic/jsx-curly-spacing": ["warn", "never"],
  "@stylistic/jsx-equals-spacing": ["warn", "never"],
  "@stylistic/jsx-indent-props": ["warn", 2],
  "@stylistic/jsx-tag-spacing": ["warn", { afterOpening: "never", beforeClosing: "allow", beforeSelfClosing: "always", closingSlash: "never" }],
  "@stylistic/key-spacing": "warn",
  "@stylistic/keyword-spacing": "warn",
  "@stylistic/object-curly-spacing": ["warn", "always"],
  "@stylistic/quotes": ["warn", "double", { avoidEscape: true }],
  "@stylistic/semi": ["warn", "always"],
  "@stylistic/space-before-blocks": "warn",
  "@stylistic/space-before-function-paren": ["warn", { anonymous: "always", asyncArrow: "always", named: "never" }],
  "@stylistic/space-in-parens": ["warn", "never"],
};
const REACT_HOOKS_STABLE_RULES = {
  "react-hooks/exhaustive-deps": "warn",
  "react-hooks/rules-of-hooks": "error",
};

export default defineConfig([
  globalIgnores(["dist", "apps/desktop/src-tauri/target"]),

  {
    files: TYPESCRIPT_SOURCE_FILES,
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
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
      ...STYLISTIC_FIXABLE_RULES,
      ...REACT_HOOKS_STABLE_RULES,
      "@stylistic/max-len": "off",
      "@stylistic/object-curly-newline": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-refresh/only-export-components": "off",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: IMPORT_PATH_RESTRICTED_PATHS,
          patterns: IMPORT_PATH_RESTRICTED_PATTERNS,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: String.raw`ImportDeclaration[source.value=/^\.\.\//]`,
          message: "Use an alias for cross-folder imports. Same-directory imports may use ./.",
        },
        {
          selector: String.raw`ImportDeclaration[source.value=/^\.\/[^.\/][^/]*\//]`,
          message: "Use an alias for child-folder imports. Same-directory imports may use ./.",
        },
      ],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "simple-import-sort/imports": [
        "warn",
        {
          groups: SIMPLE_IMPORT_SORT_GROUPS,
        },
      ],
    },
  },
  {
    files: UI_SOURCE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: IMPORT_PATH_RESTRICTED_PATHS,
          patterns: UI_RESTRICTED_IMPORT_PATTERNS,
        },
      ],
    },
  },
  {
    files: APPLICATION_SOURCE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: IMPORT_PATH_RESTRICTED_PATHS,
          patterns: IMPORT_PATH_RESTRICTED_PATTERNS,
        },
      ],
    },
  },
]);