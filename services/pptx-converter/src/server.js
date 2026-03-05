const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");
const { Storage } = require("@google-cloud/storage");

const TOKEN_ENV = "PPTX_CONVERTER_TOKEN";
const STORAGE_BUCKET_ENV = "PPTX_STORAGE_BUCKET";
const PORT = Number(process.env.PORT || 8080);
const COMMAND_TIMEOUT_MS = Number(
  process.env.PPTX_COMMAND_TIMEOUT_MS || 120000,
);
const CONVERSION_DPI = Number(process.env.PPTX_CONVERSION_DPI || 160);
const MAX_SLIDES = Number(process.env.PPTX_MAX_SLIDES || 200);

const storage = new Storage();

class ConverterError extends Error {
  /**
   * @param {string} code
   * @param {number} statusCode
   * @param {string | null} detail
   */
  constructor(code, statusCode, detail = null) {
    super(code);
    this.name = "ConverterError";
    this.code = code;
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const asNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const PROJECT_ID =
  asNonEmptyString(process.env.GOOGLE_CLOUD_PROJECT) ??
  asNonEmptyString(process.env.GCLOUD_PROJECT) ??
  asNonEmptyString(process.env.PROJECT_ID);

const hasUnsafePathFragments = (value) =>
  value.includes("..") || value.includes("\\") || value.includes("//");

const buildDocumentPrefix = (userId, docId) =>
  `users/${userId}/documents/${docId}/`;

const isScopedSourcePath = (value, userId, docId) =>
  value.startsWith(buildDocumentPrefix(userId, docId));

const padSlideNumber = (index) => String(index).padStart(4, "0");

const safeErrorLabel = (error) => {
  if (!error) return "unknown_error";
  if (error instanceof ConverterError) return error.code;
  if (error instanceof Error) return error.message || error.name;
  return String(error);
};

const resolveBucketName = () => {
  const fromEnv = asNonEmptyString(process.env[STORAGE_BUCKET_ENV]);
  if (fromEnv) return fromEnv;
  if (PROJECT_ID) return `${PROJECT_ID}.firebasestorage.app`;
  return null;
};

const DEFAULT_BUCKET_NAME = resolveBucketName();

/**
 * @param {string} filePath
 * @returns {Promise<{ width: number; height: number }>}
 */
const readPngDimensions = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 24) {
    throw new ConverterError("png_header_invalid", 500);
  }
  const pngSignature = "89504e470d0a1a0a";
  const signatureHex = buffer.subarray(0, 8).toString("hex");
  if (signatureHex !== pngSignature) {
    throw new ConverterError("png_signature_invalid", 500);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string; timeoutMs?: number }} options
 * @returns {Promise<{ stdout: string; stderr: string }>}
 */
const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeoutMs = Number(options.timeoutMs || COMMAND_TIMEOUT_MS);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new ConverterError(
          timedOut ? `${command}_timeout` : `${command}_spawn_failed`,
          500,
          error.message,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new ConverterError(
          timedOut ? `${command}_timeout` : `${command}_failed`,
          500,
          stderr.trim().slice(0, 800) || stdout.trim().slice(0, 800) || null,
        ),
      );
    });
  });

/**
 * @param {string} stdout
 * @returns {number | null}
 */
const parsePdfPageCount = (stdout) => {
  const match = stdout.match(/^Pages:\s+(\d+)$/im);
  if (!match) return null;
  const pages = Number(match[1]);
  if (!Number.isFinite(pages) || pages <= 0) return null;
  return pages;
};

/**
 * @param {string} workingDir
 * @returns {Promise<Array<{ absolutePath: string; sourcePage: number }>>}
 */
const listGeneratedSlides = async (workingDir) => {
  const entries = await fs.readdir(workingDir, { withFileTypes: true });
  const slides = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(/^slide-(\d+)\.png$/i);
    if (!match) continue;
    const page = Number(match[1]);
    if (!Number.isFinite(page) || page <= 0) continue;
    slides.push({
      absolutePath: path.join(workingDir, entry.name),
      sourcePage: page,
    });
  }

  slides.sort((a, b) => a.sourcePage - b.sourcePage);
  return slides;
};

/**
 * @param {string} sourcePath
 * @param {string} workingDir
 * @returns {Promise<Array<{ absolutePath: string; sourcePage: number }>>}
 */
const convertPptxToSlides = async (sourcePath, workingDir) => {
  const pdfPath = path.join(workingDir, "source.pdf");
  await runCommand("soffice", [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--norestore",
    "--convert-to",
    "pdf",
    "--outdir",
    workingDir,
    sourcePath,
  ]);

  if (!fsSync.existsSync(pdfPath)) {
    throw new ConverterError("pdf_not_generated", 500);
  }

  const { stdout: pdfInfo } = await runCommand("pdfinfo", [pdfPath]);
  const pageCount = parsePdfPageCount(pdfInfo);
  if (pageCount && pageCount > MAX_SLIDES) {
    throw new ConverterError("slide_limit_exceeded", 400);
  }

  const slidePrefix = path.join(workingDir, "slide");
  await runCommand("pdftoppm", [
    "-png",
    "-r",
    String(CONVERSION_DPI),
    pdfPath,
    slidePrefix,
  ]);

  const generatedSlides = await listGeneratedSlides(workingDir);
  if (generatedSlides.length === 0) {
    throw new ConverterError("slide_images_not_generated", 500);
  }

  if (generatedSlides.length > MAX_SLIDES) {
    throw new ConverterError("slide_limit_exceeded", 400);
  }

  return generatedSlides;
};

/**
 * @param {import("@google-cloud/storage").Bucket} bucket
 * @param {{
 *   userId: string;
 *   docId: string;
 *   sourceStoragePath: string;
 *   generatedSlides: Array<{ absolutePath: string; sourcePage: number }>;
 * }} params
 * @returns {Promise<{ manifestPath: string; slideCount: number; fallbackPdfPath: null }>}
 */
const uploadSlidesAndManifest = async (bucket, params) => {
  const { userId, docId, sourceStoragePath, generatedSlides } = params;
  const destinationPrefix = `users/${userId}/documents/${docId}/pptx/`;
  const slides = [];

  for (let i = 0; i < generatedSlides.length; i += 1) {
    const slide = generatedSlides[i];
    const slideIndex = i + 1;
    const destinationName = `${destinationPrefix}slides/slide-${padSlideNumber(slideIndex)}.png`;
    const { width, height } = await readPngDimensions(slide.absolutePath);

    await bucket.upload(slide.absolutePath, {
      destination: destinationName,
      resumable: false,
      metadata: {
        contentType: "image/png",
        cacheControl: "public,max-age=31536000,immutable",
      },
    });

    slides.push({
      index: slideIndex,
      path: destinationName,
      width,
      height,
    });
  }

  const manifestPath = `${destinationPrefix}manifest.json`;
  const manifest = {
    version: 1,
    docId,
    userId,
    sourceStoragePath,
    slideCount: slides.length,
    slides,
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
    slideCount: slides.length,
    fallbackPdfPath: null,
  };
};

const validateToken = (providedToken) => {
  const configuredToken = asNonEmptyString(process.env[TOKEN_ENV]);
  if (!configuredToken) {
    throw new ConverterError("converter_token_misconfigured", 503);
  }
  if (!providedToken || providedToken !== configuredToken) {
    throw new ConverterError("unauthorized", 401);
  }
};

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

const convertHandler = async (req, res) => {
  const token = asNonEmptyString(req.header("x-pptx-converter-token"));

  try {
    validateToken(token);

    const userId = asNonEmptyString(req.body?.userId);
    const docId = asNonEmptyString(req.body?.docId);
    const sourceStoragePath = asNonEmptyString(req.body?.sourceStoragePath);

    if (!userId || !docId || !sourceStoragePath) {
      throw new ConverterError("invalid_payload", 400);
    }
    if (hasUnsafePathFragments(sourceStoragePath)) {
      throw new ConverterError("source_path_unsafe", 400);
    }
    if (!isScopedSourcePath(sourceStoragePath, userId, docId)) {
      throw new ConverterError("source_scope_violation", 400);
    }

    if (!DEFAULT_BUCKET_NAME) {
      throw new ConverterError("converter_bucket_misconfigured", 503);
    }
    const bucket = storage.bucket(DEFAULT_BUCKET_NAME);
    const sourceObject = bucket.file(sourceStoragePath);
    const [exists] = await sourceObject.exists();
    if (!exists) {
      throw new ConverterError("source_not_found", 404);
    }

    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "pptx-converter-"),
    );
    try {
      const localPptxPath = path.join(tempRoot, "source.pptx");
      await sourceObject.download({ destination: localPptxPath });

      const generatedSlides = await convertPptxToSlides(
        localPptxPath,
        tempRoot,
      );
      const conversionResult = await uploadSlidesAndManifest(bucket, {
        userId,
        docId,
        sourceStoragePath,
        generatedSlides,
      });

      console.info("[PptxConverterService] conversion completed", {
        userId,
        docId,
        sourceStoragePath,
        manifestPath: conversionResult.manifestPath,
        slideCount: conversionResult.slideCount,
      });
      res.status(200).json(conversionResult);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    if (error instanceof ConverterError) {
      if (error.statusCode >= 500) {
        console.error("[PptxConverterService] conversion failed", {
          code: error.code,
          detail: error.detail,
        });
      }
      res.status(error.statusCode).json({ error: error.code });
      return;
    }

    console.error("[PptxConverterService] unexpected failure", {
      error: safeErrorLabel(error),
    });
    res.status(500).json({ error: "conversion_failed" });
  }
};

app.post("/", convertHandler);
app.post("/convert", convertHandler);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.listen(PORT, () => {
  console.info("[PptxConverterService] listening", {
    port: PORT,
    bucket: DEFAULT_BUCKET_NAME ?? "(unset)",
    maxSlides: MAX_SLIDES,
    dpi: CONVERSION_DPI,
    timeoutMs: COMMAND_TIMEOUT_MS,
  });
});
