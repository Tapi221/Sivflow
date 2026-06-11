import { readFileSync, writeFileSync } from "node:fs";

import path from "node:path";

const ROOT_DIR = process.cwd();

const fileReplacements = [
  {
    filePath: "src/components/ui/ai-menu.tsx",
    replacements: [
      [
        `  return (\n    <>\n      {menuGroups.map((group, index) => (\n        <CommandGroup key={index} heading={group.heading}>\n          {group.items.map((menuItem) => (\n            <CommandItem\n              key={menuItem.value}\n              className="[&_svg]:text-muted-foreground"\n              value={menuItem.value}\n              onSelect={() => {\n                menuItem.onSelect?.({\n                  aiEditor,\n                  editor,\n                  input,\n                });\n                setInput('');\n              }}\n            >\n              {menuItem.icon}\n              <span>{menuItem.label}</span>\n            </CommandItem>\n          ))}\n        </CommandGroup>\n      ))}\n    </>\n  );`,
        `  return menuGroups.map((group, index) => (\n    <CommandGroup key={index} heading={group.heading}>\n      {group.items.map((menuItem) => (\n        <CommandItem\n          key={menuItem.value}\n          className="[&_svg]:text-muted-foreground"\n          value={menuItem.value}\n          onSelect={() => {\n            menuItem.onSelect?.({\n              aiEditor,\n              editor,\n              input,\n            });\n            setInput('');\n          }}\n        >\n          {menuItem.icon}\n          <span>{menuItem.label}</span>\n        </CommandItem>\n      ))}\n    </CommandGroup>\n  ));`,
      ],
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
    filePath: "src/routes/SettingScreen.tsx",
    replacements: [["<>{children}</>", "{children}"]],
  },
];

for (const { filePath, replacements } of fileReplacements) {
  const absolutePath = path.join(ROOT_DIR, filePath);
  const before = readFileSync(absolutePath, "utf8");
  let after = before;

  for (const [from, to] of replacements) {
    after = after.replaceAll(from, to);
  }

  if (after !== before) {
    writeFileSync(absolutePath, after);
  }
}
