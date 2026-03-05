import { onSecurityLogCreated } from "./security";
import { onPptxConversionQueued } from "./pptxConversion";
import { pptxConverterEndpoint } from "./pptxConverterEndpoint";

// セキュリティ関連のトリガーをエクスポート
export { onSecurityLogCreated };
export { onPptxConversionQueued };
export { pptxConverterEndpoint };
