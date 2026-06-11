import type { FileRouter } from "uploadthing/next";
import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();
const ourFileRouter = { editorUploader: f(["image", "text", "blob", "pdf", "video", "audio"]).middleware(() => ({})).onUploadComplete(({ file }) => ({ key: file.key, name: file.name, size: file.size, type: file.type, url: file.ufsUrl })) } satisfies FileRouter;

type OurFileRouter = typeof ourFileRouter;

export { ourFileRouter };
export type { OurFileRouter };
