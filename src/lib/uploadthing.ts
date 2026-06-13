type UploadThingFileRouter = {
  editorUploader: {
    allowedTypes: readonly ["image", "text", "blob", "pdf", "video", "audio"];
  };
};

const ourFileRouter = {
  editorUploader: {
    allowedTypes: ["image", "text", "blob", "pdf", "video", "audio"],
  },
} satisfies UploadThingFileRouter;

type OurFileRouter = typeof ourFileRouter;

export { ourFileRouter };
export type { OurFileRouter };
