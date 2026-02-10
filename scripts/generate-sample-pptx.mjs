#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import PptxGenJS from "pptxgenjs";

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=";

const getArgValue = (name, fallback = null) => {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name) return argv[i + 1] ?? fallback;
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return fallback;
};

const outArg = getArgValue("--out", "tmp/sample.pptx");
const slidesArg = Number.parseInt(String(getArgValue("--slides", "3")), 10);
const slideCount = Number.isFinite(slidesArg) ? Math.min(Math.max(slidesArg, 1), 10) : 3;

const outputPath = path.resolve(process.cwd(), outArg);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "FlashcardMaster E2E";
pptx.subject = "PPTX converter E2E sample";
pptx.company = "FlashcardMaster";
pptx.title = "Sample PPTX";

for (let i = 0; i < slideCount; i += 1) {
  const slide = pptx.addSlide();
  const n = i + 1;
  slide.background = { color: "F8FAFC" };

  slide.addText(`PPTX Converter E2E - Slide ${n}`, {
    x: 0.6,
    y: 0.5,
    w: 11.8,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: "0F172A",
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.4,
    w: 6.0,
    h: 2.2,
    fill: { color: n % 2 === 0 ? "DBEAFE" : "E2E8F0" },
    line: { color: "94A3B8", pt: 1 },
    radius: 0.08,
  });

  slide.addText(
    `This is a generated test deck.\nSlide index: ${n}\nGenerated at: ${new Date().toISOString()}`,
    {
      x: 1.1,
      y: 1.7,
      w: 5.4,
      h: 1.5,
      fontSize: 16,
      color: "334155",
    }
  );

  slide.addImage({
    data: `data:image/png;base64,${PNG_1PX_BASE64}`,
    x: 8.2,
    y: 1.6,
    w: 2.6,
    h: 2.0,
  });
}

await pptx.writeFile({ fileName: outputPath });
console.log(`Generated: ${outputPath}`);
console.log(`Slides: ${slideCount}`);
