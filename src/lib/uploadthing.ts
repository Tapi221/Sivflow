import { createUploadthing } from "uploadthing/next";
import type { FileRouter } from "uploadthing/next";

const f = createUploadthing();
const ourFileRouter = {
  editorUploader: f({
    audio: { maxFileSize: "64MB" },
    blob: { maxFileSize: "64MB" },
    image: { maxFileSize: "16MB" },
    pdf: { maxFileSize: "32MB" },
    text: { maxFileSize: "8MB" },
    video: { maxFileSize: "256MB" },
  }).onUploadComplete(({ file }) => file),
} satisfies FileRouter;

type OurFileRouter = typeof ourFileRouter;

export { ourFileRouter };
export type { OurFileRouter };
