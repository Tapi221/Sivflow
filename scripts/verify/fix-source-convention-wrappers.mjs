import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const FILE_REPLACEMENTS = [
  {
    filePath: "src/components/card/media/CardMedia.tsx",
    replacements: [
      ["        <div key={index}>\n          <audio", "        <Fragment key={index}>\n          <audio"],
      ["          </Button>\n        </div>\n      ))}", "          </Button>\n        </Fragment>\n      ))}"],
    ],
  },
  {
    filePath: "src/components/folder/panes/RightPane.tsx",
    replacements: [
      ["        <>\n          PowerPoint の表示機能は廃止しました。必要な資料は PDF\n          に変換して再アップロードしてください。\n        </>", "        PowerPoint の表示機能は廃止しました。必要な資料は PDF\n        に変換して再アップロードしてください。"],
    ],
  },
  {
    filePath: "src/components/ui/ai-menu.tsx",
    replacements: [
      ["  return (\n    <>\n      {menuGroups.map((group, index) => (", "  return menuGroups.map((group, index) => ("],
      ["      ))}\n    </>\n  );\n};", "  ));\n};"],
    ],
  },
  {
    filePath: "src/components/ui/block-discussion.tsx",
    replacements: [
      ["if (!isTopLevelBlock) return <>{children}</>;", "if (!isTopLevelBlock) return children;"],
      ["<React.Fragment key={discussion.id}>", "<>"],
      ["</React.Fragment>", "</>"],
    ],
  },
  {
    filePath: "src/components/ui/equation-node-static.tsx",
    replacements: [
      ["<>Add a Tex equation</>", "Add a Tex equation"],
    ],
  },
  {
    filePath: "src/components/ui/equation-node.tsx",
    replacements: [
      ["<>Add a Tex equation</>", "Add a Tex equation"],
    ],
  },
  {
    filePath: "src/components/ui/media-file-node-static.tsx",
    replacements: [
      ["<>{name}</>", "{name}"],
    ],
  },
  {
    filePath: "src/components/ui/media-file-node.tsx",
    replacements: [
      ["<>{name}</>", "{name}"],
    ],
  },
  {
    filePath: "src/components/ui/media-placeholder-node.tsx",
    replacements: [
      ["<>\n                {loading ? uploadingFile?.name : currentContent.content}\n              </>", "{loading ? uploadingFile?.name : currentContent.content}"],
      ["<>{formatBytes(uploadingFile?.size ?? 0)}</>", "{formatBytes(uploadingFile?.size ?? 0)}"],
      ["<>–</>", "{'–'}"],
    ],
  },
  {
    filePath: "src/components/ui/suggestion-node.tsx",
    replacements: [
      ["  return (\n    <>\n      {isLineBreak ? (", "  return isLineBreak ? ("],
      ["      )}\n    </>\n  );", "  ) : (\n    <div\n      className={getBlockSuggestionWrapperClassName({\n        elementType,\n        isActive,\n        isHover,\n        isInsert,\n        isRemove,\n      })}\n      onMouseEnter={() => setOption('hoverId', suggestionData.id)}\n      onMouseLeave={() => setOption('hoverId', null)}\n      data-block-suggestion=\"true\"\n    >\n      {children}\n    </div>\n  );"],
    ],
  },
  {
    filePath: "src/components/ui/table-node.tsx",
    replacements: [
      ["<>Top Border</>", "Top Border"],
      ["<>Right Border</>", "Right Border"],
      ["<>Bottom Border</>", "Bottom Border"],
      ["<>Left Border</>", "Left Border"],
      ["<>No Border</>", "No Border"],
      ["<>Outside Borders</>", "Outside Borders"],
    ],
  },
  {
    filePath: "src/components/ui/toc-node-static.tsx",
    replacements: [
      ["      <>\n        {headingList.length > 0 ? (", "      {headingList.length > 0 ? ("],
      ["        )}\n      </>", "        )}"],
    ],
  },
  {
    filePath: "src/features/cardsetview/presentation/web/ui/components/CardSurfaceLayout.tsx",
    replacements: [
      ["return <>{flipNode ?? questionNode}</>;", "return flipNode ?? questionNode;"],
    ],
  },
  {
    filePath: "src/routes/SettingScreen.tsx",
    replacements: [
      ["<>{children}</>", "{children}"],
    ],
  },
  {
    filePath: "tests/unit/contexts/BreadcrumbContext.test.tsx",
    replacements: [
      ["return (\n    <>{extraCrumbs.map(({ label }) => label).join(\" / \") || \"empty\"}</>\n  );", "return extraCrumbs.map(({ label }) => label).join(\" / \") || \"empty\";"],
    ],
  },
  {
    filePath: "tests/unit/features/review/VerticalCardPager.test.tsx",
    replacements: [
      ["renderCard={(card) => <>{card}</>}", "renderCard={(card) => card}"],
    ],
  },
  {
    filePath: "tests/unit/pane.desktop/leftpane/schedule/CalendarSidebar.test.tsx",
    replacements: [
      ["SelectableGoogleSourceRow: ({ label }: { label: string }) => <>{label}</>,", "SelectableGoogleSourceRow: ({ label }: { label: string }) => label,"],
    ],
  },
];

const applyReplacements = (source, replacements) => replacements.reduce((currentSource, [before, after]) => currentSource.split(before).join(after), source);

const fixFile = ({ filePath, replacements }) => {
  const absolutePath = path.join(ROOT_DIR, filePath);
  if (!existsSync(absolutePath)) return false;

  const before = readFileSync(absolutePath, "utf8");
  const after = applyReplacements(before, replacements);
  if (after === before) return false;

  writeFileSync(absolutePath, after);
  return true;
};

for (const entry of FILE_REPLACEMENTS) {
  fixFile(entry);
}
