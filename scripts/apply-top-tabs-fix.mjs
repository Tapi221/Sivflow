import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const repoRoot = process.cwd();

const workspaceTabsSourcePath = join(
  packageRoot,
  "src/features/workspace-tabs/components/WorkspaceTabsBar.tsx",
);
const targetWorkspaceTabsPath = join(
  repoRoot,
  "src/features/workspace-tabs/components/WorkspaceTabsBar.tsx",
);
const titleBarPath = join(repoRoot, "src/layout/TitleBar.tsx");
const foldersScreenPath = join(
  repoRoot,
  "src/features/explorer/screens/FoldersScreen.tsx",
);

const readText = (path) => readFileSync(path, "utf8");
const writeText = (path, content) => writeFileSync(path, content, "utf8");

const assertFile = (path) => {
  if (!existsSync(path)) {
    throw new Error(`対象ファイルが見つかりません: ${path}`);
  }
};

const backupOnce = (path) => {
  const backupPath = `${path}.bak.top-tabs`;
  if (!existsSync(backupPath)) {
    copyFileSync(path, backupPath);
  }
};

const replaceOnce = (source, searchValue, replaceValue, label) => {
  if (!source.includes(searchValue)) {
    throw new Error(`置換対象が見つかりません: ${label}`);
  }

  return source.replace(searchValue, replaceValue);
};

const patchTitleBar = () => {
  assertFile(titleBarPath);
  backupOnce(titleBarPath);

  let source = readText(titleBarPath);

  const workspaceTabsImport =
    'import { WorkspaceTabsBar } from "@/features/workspace-tabs/components/WorkspaceTabsBar";\n';
  const importAnchor =
    'import { useCalendarDockPanelStore } from "@/features/calendar/store/useCalendarDockPanelStore";\n';

  if (!source.includes(workspaceTabsImport)) {
    source = replaceOnce(
      source,
      importAnchor,
      `${importAnchor}${workspaceTabsImport}`,
      "WorkspaceTabsBar import",
    );
  }

  const cardSetPageLine =
    '  const isCardSetViewPage = pathname.toLowerCase().startsWith("/cardsetview");\n';
  const foldersPageLine =
    '  const isFoldersPage = pathname.toLowerCase().startsWith("/folders");\n';

  if (!source.includes(foldersPageLine)) {
    source = replaceOnce(
      source,
      cardSetPageLine,
      `${cardSetPageLine}${foldersPageLine}`,
      "isFoldersPage declaration",
    );
  }

  const oldLeftRegion = `      <div
        className={cn(
          "flex h-full min-w-0 items-center pl-2 pr-3",
          shouldShowBrandLabel && "gap-2",
        )}
        style={noDragStyle}
      >
        <TitleBarPrimaryActions noDragStyle={noDragStyle} />

        {shouldShowBrandLabel ? (
          <span className="titlebar-text-strong shrink-0 text-xs font-semibold tracking-wide">
            {APP_CHROME.brandLabel}
          </span>
        ) : null}

        <TitleBarBreadcrumbs
          pathname={pathname}
          baseCrumbs={baseCrumbs}
          extraCrumbs={extraCrumbs}
          noDragStyle={noDragStyle}
        />
      </div>`;

  const newLeftRegion = `      <div
        className={cn(
          "flex h-full min-w-0 flex-1 items-center pl-2 pr-3",
          shouldShowBrandLabel && !isFoldersPage && "gap-2",
        )}
        style={isFoldersPage ? undefined : noDragStyle}
      >
        {isFoldersPage ? (
          <WorkspaceTabsBar
            variant="titlebar"
            noDragStyle={noDragStyle}
            className="max-w-[760px]"
          />
        ) : (
          <>
            <TitleBarPrimaryActions noDragStyle={noDragStyle} />

            {shouldShowBrandLabel ? (
              <span className="titlebar-text-strong shrink-0 text-xs font-semibold tracking-wide">
                {APP_CHROME.brandLabel}
              </span>
            ) : null}

            <TitleBarBreadcrumbs
              pathname={pathname}
              baseCrumbs={baseCrumbs}
              extraCrumbs={extraCrumbs}
              noDragStyle={noDragStyle}
            />
          </>
        )}
      </div>`;

  if (!source.includes('variant="titlebar"')) {
    source = replaceOnce(
      source,
      oldLeftRegion,
      newLeftRegion,
      "TitleBar left region",
    );
  }

  const oldRightRegionStart = `      <div
        className="titlebar-text flex h-full items-center"
        style={noDragStyle}
      >
        {isCardSetViewPage && (`;

  const newRightRegionStart = `      <div
        className="titlebar-text flex h-full items-center"
        style={noDragStyle}
      >
        {isFoldersPage ? (
          <TitleBarPrimaryActions noDragStyle={noDragStyle} />
        ) : null}

        {isCardSetViewPage && (`;

  if (!source.includes("{isFoldersPage ? (\n          <TitleBarPrimaryActions")) {
    source = replaceOnce(
      source,
      oldRightRegionStart,
      newRightRegionStart,
      "TitleBar right actions",
    );
  }

  writeText(titleBarPath, source);
};

const patchFoldersScreen = () => {
  assertFile(foldersScreenPath);
  backupOnce(foldersScreenPath);

  let source = readText(foldersScreenPath);

  if (!source.includes("{route.isDesktop ? null : <WorkspaceTabsBar />}")) {
    source = replaceOnce(
      source,
      "      <WorkspaceTabsBar />",
      "      {route.isDesktop ? null : <WorkspaceTabsBar />}",
      "desktop-only workspace tabs",
    );
  }

  writeText(foldersScreenPath, source);
};

const replaceWorkspaceTabsBar = () => {
  assertFile(workspaceTabsSourcePath);
  assertFile(targetWorkspaceTabsPath);
  backupOnce(targetWorkspaceTabsPath);
  copyFileSync(workspaceTabsSourcePath, targetWorkspaceTabsPath);
};

const main = () => {
  replaceWorkspaceTabsBar();
  patchTitleBar();
  patchFoldersScreen();

  console.log("top-tabs fix applied");
  console.log("次に実行: npm run typecheck && npm run build");
};

main();
