import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "@/components/ui/fixed-toolbar";

import { PlateFixedToolbarButtons } from "./PlateFixedToolbarButtons";

const PlateFixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <PlateFixedToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];

export { PlateFixedToolbarKit };
