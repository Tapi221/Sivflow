import type { FileRouter } from "uploadthing/server";
import { createUploadthing } from "uploadthing/server";



const f = createUploadthing();
const ourFileRouter = {
  editorUploader: f({
    audio: { maxFileSize: "64MB" },
    blob: { maxFileSize: "64MB" },
    image: { maxFileSize: "16MB" },
    pdf: { maxFileSize: "32MB" },
    text: { maxFileSize: "8MB" },
    video: { maxFileSize: "256MB" },
  }).onUploadComplete(({ file }) => ({
    key: file.key,
    name: file.name,
    size: file.size,
    type: file.type,
    url: file.url,
  })),
} satisfies FileRouter;



type OurFileRouter = typeof ourFileRouter;



export { ourFileRouter };


export type { OurFileRouter };
