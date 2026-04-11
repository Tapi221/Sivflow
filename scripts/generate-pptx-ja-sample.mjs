import path from "node:path";
import fs from "node:fs/promises";
import PptxGenJS from "pptxgenjs";

const parseArgs = (argv) => {
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0) {
    const value = argv[outIndex + 1];
    return { outDir: typeof value === "string" && value.trim() ? value.trim() : "tmp" };
  }
  return { outDir: "tmp" };
};

const buildSamplePptx = () => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const slide1 = pptx.addSlide();
  slide1.addText("日本語/数式フォント表示テスト（PPTX→PDF→PNG）", {
    x: 0.6,
    y: 0.6,
    w: 12.0,
    h: 0.8,
    fontFace: "Yu Gothic",
    fontSize: 28,
    color: "111111",
  });
  slide1.addText("日本語: あいうえお / 漢字: 亜院影億織 / 記号: ※ 〒 → ㈱", {
    x: 0.8,
    y: 1.7,
    w: 12.0,
    h: 0.8,
    fontFace: "MS Gothic",
    fontSize: 24,
    color: "111111",
  });
  slide1.addText("数式記号サンプル: ∑ √ ≤ ≥ ⇔ ∀ ∃ ∫ ≈ ≠", {
    x: 0.8,
    y: 2.8,
    w: 12.0,
    h: 0.8,
    fontFace: "Cambria Math",
    fontSize: 22,
    color: "111111",
  });

  const slide2 = pptx.addSlide();
  slide2.addText("等幅・幅依存チェック", {
    x: 0.8,
    y: 0.8,
    w: 12.0,
    h: 0.6,
    fontFace: "MS Gothic",
    fontSize: 24,
    color: "111111",
  });
  slide2.addText("全角: ＡＢＣＤＥＦＧ １２３４５ / 半角: ABCDEFG 12345", {
    x: 0.8,
    y: 1.7,
    w: 12.0,
    h: 0.8,
    fontFace: "MS Gothic",
    fontSize: 20,
    color: "111111",
  });

  return pptx;
};

const run = async () => {
  const { outDir } = parseArgs(process.argv.slice(2));
  const absoluteOutDir = path.resolve(process.cwd(), outDir);
  await fs.mkdir(absoluteOutDir, { recursive: true });

  const pptx = buildSamplePptx();
  const outputPath = path.join(absoluteOutDir, "sample-ja-fonts.pptx");
  await pptx.writeFile({ fileName: outputPath });

  console.info("[generate-pptx-ja-sample] written:", outputPath);
};

await run();
