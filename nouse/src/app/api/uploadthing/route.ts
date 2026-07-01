import { createRouteHandler } from "uploadthing/server";
import { ourFileRouter } from "@/lib/uploadthing";



const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});



export { GET, POST };
