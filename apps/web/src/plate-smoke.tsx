import "@/styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlateDocumentEditor } from "@/components/note/PlateDocumentEditor";
import type { Note } from "@/types";

const now = new Date();
const note: Note = {
  id: "plate-smoke",
  userId: "smoke-user",
  deviceId: "smoke-device",
  folderId: "smoke-folder",
  orderIndex: 0,
  title: "Plate Smoke",
  content: [{ type: "p", children: [{ text: "Plate official toolbar smoke test" }] }],
  contentVersion: 2,
  editor: "plate",
  isDeleted: false,
  createdAt: now,
  updatedAt: now,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-screen w-screen">
      <PlateDocumentEditor note={note} onChange={() => undefined} />
    </div>
  </StrictMode>,
);
