import { bucket } from "../../../shared/firebaseAdmin";
import {
  ManifestPayload,
  ResolvedManifestMetadata,
} from "../../domain/conversionTypes";
import { createPptxConversionError } from "../../domain/errors";
import { parseManifestContents } from "../../domain/manifest";
import {
  hasUnsafePathFragments,
  isScopedStoragePath,
} from "../../security/guards";

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=";

const normalizePrefix = (value: string): string =>
  value.endsWith("/") ? value : `${value}/`;

export const buildPptxBasePath = ({
  userId,
  docId,
}: {
  userId: string;
  docId: string;
}): string => normalizePrefix(`users/${userId}/documents/${docId}/pptx/`);

export const buildDefaultManifestPath = ({
  userId,
  docId,
}: {
  userId: string;
  docId: string;
}): string => `${buildPptxBasePath({ userId, docId })}manifest.json`;

export const readManifestMetadata = async ({
  manifestPath,
  userId,
  docId,
}: {
  manifestPath: string;
  userId: string;
  docId: string;
}): Promise<ResolvedManifestMetadata> => {
  if (!isScopedStoragePath(manifestPath, userId, docId)) {
    throw createPptxConversionError(`manifest_scope_violation:${manifestPath}`);
  }

  const file = bucket.file(manifestPath);
  const [exists] = await file.exists();

  if (!exists) {
    throw createPptxConversionError(`manifest_not_found:${manifestPath}`);
  }

  const [contents] = await file.download();

  return parseManifestContents(
    contents.toString("utf8"),
    manifestPath,
    userId,
    docId,
  );
};

export const savePlaceholderManifest = async ({
  userId,
  docId,
  sourceStoragePath,
}: {
  userId: string;
  docId: string;
  sourceStoragePath: string;
}): Promise<ResolvedManifestMetadata> => {
  if (!isScopedStoragePath(sourceStoragePath, userId, docId)) {
    throw createPptxConversionError("source_scope_violation", 400);
  }

  if (hasUnsafePathFragments(sourceStoragePath)) {
    throw createPptxConversionError("source_path_unsafe", 400);
  }

  const sourceFile = bucket.file(sourceStoragePath);
  const [sourceExists] = await sourceFile.exists();

  if (!sourceExists) {
    throw createPptxConversionError("source_not_found", 404);
  }

  const destinationPrefix = buildPptxBasePath({ userId, docId });
  const slidePath = `${destinationPrefix}slides/slide-0001.png`;
  const manifestPath = `${destinationPrefix}manifest.json`;
  const slideBytes = Buffer.from(PNG_1PX_BASE64, "base64");

  await bucket.file(slidePath).save(slideBytes, {
    resumable: false,
    contentType: "image/png",
    metadata: {
      cacheControl: "public,max-age=31536000,immutable",
    },
  });

  const manifest: ManifestPayload = {
    version: 1,
    docId,
    userId,
    sourceStoragePath,
    slideCount: 1,
    fallbackPdfPath: null,
    slides: [
      {
        index: 1,
        path: slidePath,
        width: 1,
        height: 1,
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  await bucket.file(manifestPath).save(JSON.stringify(manifest), {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: {
      cacheControl: "no-cache",
    },
  });

  return {
    manifestPath,
    slideCount: 1,
    fallbackPdfPath: null,
  };
};
