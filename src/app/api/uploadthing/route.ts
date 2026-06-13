const createLocalUploadResponse = () => Response.json(
  {
    error: "UploadThing server upload is disabled. Client uploads use local object URLs.",
    ok: false,
  },
  { status: 501 },
);
const GET = createLocalUploadResponse;
const POST = createLocalUploadResponse;

export { GET, POST };
