import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateComposeTheme } from "./generate-compose-theme";
import { generateReactTheme } from "./generate-react-theme";
import { generateSwiftTokens } from "./generate-swift-tokens";

type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type TokenBundle = Record<string, JsonValue>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const tokenDirectory = path.join(repoRoot, "design", "tokens");

const tokenFiles = [
  "color.json",
  "spacing.json",
  "radius.json",
  "typography.json",
  "motion.json",
  "elevation.json",
  "layout.json",
  "semantic.json",
] as const;

const isRecord = (value: JsonValue): value is Record<string, JsonValue> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveReference = (source: TokenBundle, pointer: string): JsonValue => {
  const segments = pointer.split(".");
  let current: JsonValue | undefined = source;

  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      throw new Error(`Unknown token reference: ${pointer}`);
    }

    current = current[segment];
  }

  return current;
};

const resolveJsonValue = (
  source: TokenBundle,
  value: JsonValue,
  parentKey = "",
): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((entry) => resolveJsonValue(source, entry, parentKey));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolveJsonValue(
          source,
          entry,
          parentKey ? `${parentKey}.${key}` : key,
        ),
      ]),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  const fullMatch = value.match(/^\{([^}]+)\}$/);
  if (fullMatch) {
    return resolveJsonValue(
      source,
      resolveReference(source, fullMatch[1]),
      parentKey,
    );
  }

  return value.replaceAll(/\{([^}]+)\}/g, (_, pointer: string) => {
    const resolved = resolveJsonValue(
      source,
      resolveReference(source, pointer),
      pointer,
    );
    if (Array.isArray(resolved) || isRecord(resolved)) {
      throw new Error(`String interpolation requires scalar token: ${pointer}`);
    }

    return String(resolved);
  });
};

const loadTokens = async (): Promise<TokenBundle> => {
  const entries = await Promise.all(
    tokenFiles.map(async (filename) => {
      const raw = await readFile(path.join(tokenDirectory, filename), "utf8");
      return [
        filename.replace(".json", ""),
        JSON.parse(raw) as JsonValue,
      ] as const;
    }),
  );

  const base = Object.fromEntries(entries) as TokenBundle;
  return resolveJsonValue(base, base) as TokenBundle;
};

const writeOutput = async (targetPath: string, contents: string) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents, "utf8");
};

const main = async () => {
  const tokens = await loadTokens();
  const react = generateReactTheme(tokens);
  const swift = generateSwiftTokens(tokens);
  const compose = generateComposeTheme(tokens);

  await Promise.all([
    writeOutput(
      path.join(
        repoRoot,
        "src",
        "presentation",
        "react",
        "theme",
        "design-tokens.css",
      ),
      react.css,
    ),
    writeOutput(
      path.join(
        repoRoot,
        "src",
        "presentation",
        "react",
        "theme",
        "design-tokens.ts",
      ),
      react.ts,
    ),
    writeOutput(
      path.join(repoRoot, "src", "presentation", "react", "theme", "index.ts"),
      react.index,
    ),
    writeOutput(
      path.join(
        repoRoot,
        "ios",
        "App",
        "DesignSystem",
        "Tokens",
        "GeneratedDesignTokens.swift",
      ),
      swift,
    ),
    writeOutput(
      path.join(
        repoRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "akari221",
        "flashcardmaster",
        "designsystem",
        "tokens",
        "GeneratedDesignTokens.kt",
      ),
      compose,
    ),
  ]);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
