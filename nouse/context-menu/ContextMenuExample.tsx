import React, { useMemo, useState } from "react";
import { ContextMenu, ContextMenuBuilder, MenuAction } from "./ContextMenu";

const action = (id: string, shortcut: string, run: () => void): MenuAction => ({
  id,
  shortcut,
  run,
});

export function ContextMenuExample() {
  const [open, setOpen] = useState(true);
  const [checked, setChecked] = useState(false);

  const items = useMemo(
    () =>
      ContextMenuBuilder.build((menu) =>
        menu
          .header("File")
          .action("New File", action("new-file", "⌘N", () => console.log("new file")))
          .action("Open File", action("open-file", "⌘O", () => console.log("open file")))
          .separator()
          .toggleableEntry("Show Hidden Files", checked, "start", null, () =>
            setChecked((value) => !value),
          )
          .submenu("Open Recent", () =>
            ContextMenuBuilder.build((submenu) =>
              submenu
                .entry("project-a", null, () => console.log("project-a"))
                .entry("project-b", null, () => console.log("project-b"))
                .submenu("Nested", () =>
                  ContextMenuBuilder.build((nested) =>
                    nested.entry("deep item", null, () => console.log("deep")),
                  ),
                ),
            ),
          )
          .separator()
          .entryObject({
            label: "Disabled with docs",
            disabled: true,
            documentationAside: {
              side: "right",
              render: () => <div>This item is disabled because no project is open.</div>,
            },
          }),
      ),
    [checked],
  );

  return (
    <div style={{ padding: 48 }}>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>

      {open && (
        <div style={{ position: "absolute", top: 90, left: 48 }}>
          <ContextMenu items={items} onDismiss={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
