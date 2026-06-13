import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

const { GET, POST } = createRouteHandler({ router: ourFileRouter });

export { GET, POST };
