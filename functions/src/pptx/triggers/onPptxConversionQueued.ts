import * as functions from "firebase-functions/v1";
import { handleQueuedPptxConversion } from "../application/handleQueuedPptxConversion";
import { CONVERTER_TOKEN_SECRET_ENV } from "../security/guards";

export const onPptxConversionQueued = functions
  .runWith({ secrets: [CONVERTER_TOKEN_SECRET_ENV] })
  .firestore.document("users/{userId}/pptxConversions/{docId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) {
      return;
    }

    const userId = String(context.params.userId ?? "").trim();
    const docId = String(context.params.docId ?? "").trim();
    const afterData = (change.after.data() ?? {}) as Record<string, unknown>;

    await handleQueuedPptxConversion({
      userId,
      docId,
      afterData,
    });
  });
