"use client";

import * as React from "react";
import { PlaceholderPlugin, UploadErrorCode } from "@platejs/media/react";
import { usePluginOption } from "platejs/react";
import { toast } from "sonner";

const useUploadErrorToast = () => {
  const uploadError = usePluginOption(PlaceholderPlugin, "error");
  React.useEffect(() => {
    if (!uploadError) return;
    const { code, data } = uploadError;
    switch (code) {
      case UploadErrorCode.INVALID_FILE_SIZE: {
        toast.error(
          `The size of files ${data.files
            .map((file) => file.name)
            .join(", ")} is invalid`,
        );
        break;
      }
      case UploadErrorCode.INVALID_FILE_TYPE: {
        toast.error(
          `The type of files ${data.files
            .map((file) => file.name)
            .join(", ")} is invalid`,
        );
        break;
      }
      case UploadErrorCode.TOO_LARGE: {
        toast.error(
          `The size of files ${data.files
            .map((file) => file.name)
            .join(", ")} is too large than ${data.maxFileSize}`,
        );
        break;
      }
      case UploadErrorCode.TOO_LESS_FILES: {
        toast.error(
          `The mini um number of files is ${data.minFileCount} for ${data.fileType}`,
        );
        break;
      }
      case UploadErrorCode.TOO_MANY_FILES: {
        toast.error(
          `The maximum number of files is ${data.maxFileCount} ${
            data.fileType ? `for ${data.fileType}` : ""
          }`,
        );
        break;
      }
      default: {
        break;
      }
    }
  }, [uploadError]);
};
const MediaUploadToast = () => {
  useUploadErrorToast();
  return null;
};

export { MediaUploadToast };
