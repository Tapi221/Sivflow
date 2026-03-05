import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const inputDir = path.join(projectRoot, "src/ui/stratis-svg");
const outputDir = path.join(projectRoot, "src/ui/icons/stratis");

const SVG_ATTR_ALIASES = new Map([
  ["clip-path", "clipPath"],
  ["clip-rule", "clipRule"],
  ["fill-opacity", "fillOpacity"],
  ["fill-rule", "fillRule"],
  ["flood-color", "floodColor"],
  ["flood-opacity", "floodOpacity"],
  ["mask-type", "maskType"],
  ["shape-rendering", "shapeRendering"],
  ["stop-color", "stopColor"],
  ["stop-opacity", "stopOpacity"],
  ["stroke-dasharray", "strokeDasharray"],
  ["stroke-dashoffset", "strokeDashoffset"],
  ["stroke-linecap", "strokeLinecap"],
  ["stroke-linejoin", "strokeLinejoin"],
  ["stroke-miterlimit", "strokeMiterlimit"],
  ["stroke-opacity", "strokeOpacity"],
  ["stroke-width", "strokeWidth"],
  ["color-interpolation-filters", "colorInterpolationFilters"],
  ["xmlns:xlink", "xmlnsXlink"],
  ["xlink:href", "xlinkHref"],
]);

function toPascalCase(value) {
  return value
    .replace(/\.svg$/i, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeAttributes(markup) {
  let normalized = markup.replace(/\bclass=/g, "className=");
  for (const [from, to] of SVG_ATTR_ALIASES) {
    normalized = normalized.replace(
      new RegExp(`\\b${escapeRegExp(from)}=`, "g"),
      `${to}=`,
    );
  }
  return normalized;
}

function normalizePaint(markup, prefersStroke) {
  let normalized = markup
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(
      /\sstroke="(?!none|currentColor)([^"]+)"/g,
      ' stroke="currentColor"',
    )
    .replace(
      /\sfill="(?!none|currentColor|url\(#)([^"]+)"/g,
      ' fill="currentColor"',
    );

  if (prefersStroke && !/\sfill=/.test(normalized)) {
    normalized = normalized.replace("<svg", '<svg fill="none"');
  }
  if (prefersStroke && !/\sstroke=/.test(normalized)) {
    normalized = normalized.replace("<svg", '<svg stroke="currentColor"');
  }

  return normalized;
}

function uniquifyIds(markup) {
  const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (ids.length === 0) {
    return { markup, usesIds: false };
  }

  let nextMarkup = markup;
  for (const id of ids) {
    const escaped = escapeRegExp(id);
    nextMarkup = nextMarkup.replace(
      new RegExp(`id="${escaped}"`, "g"),
      `id={\`${"${idPrefix}"}-${id}\`}`,
    );
    nextMarkup = nextMarkup.replace(
      new RegExp(`="url\\(#${escaped}\\)"`, "g"),
      `={\`url(#${"${idPrefix}"}-${id})\`}`,
    );
    nextMarkup = nextMarkup.replace(
      new RegExp(`="#${escaped}"`, "g"),
      `={\`#${"${idPrefix}"}-${id}\`}`,
    );
  }

  return { markup: nextMarkup, usesIds: true };
}

function extractSvgParts(svgSource) {
  const cleaned = svgSource
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .trim();
  const match = cleaned.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/i);
  if (!match) {
    throw new Error("SVG root element not found");
  }
  return { attributes: match[1], inner: match[2].trim() };
}

function resolveViewBox(attributes) {
  const viewBox = attributes.match(/\bviewBox="([^"]+)"/i)?.[1];
  if (viewBox) return viewBox;

  const width = attributes.match(/\bwidth="([^"]+)"/i)?.[1];
  const height = attributes.match(/\bheight="([^"]+)"/i)?.[1];
  if (width && height) return `0 0 ${width} ${height}`;
  return "0 0 24 24";
}

function buildComponentSource(componentName, svgMarkup, usesIds) {
  const hookLine = usesIds
    ? "  const idPrefix = useId().replace(/:/g, '');\n\n"
    : "";
  const reactImport = usesIds
    ? "import { forwardRef, useId } from 'react';"
    : "import { forwardRef } from 'react';";

  return `${reactImport}
import type { SVGProps } from 'react';

export type ${componentName}Props = SVGProps<SVGSVGElement>;

export const ${componentName} = forwardRef<SVGSVGElement, ${componentName}Props>(function ${componentName}(
  { className, ...props },
  ref
) {
${hookLine}  return (
    ${svgMarkup
      .replace(
        'className="block"',
        "className={['block', className].filter(Boolean).join(' ')}",
      )
      .replace("<svg ", "<svg ref={ref} {...props} ")}
  );
});
`;
}

async function main() {
  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const svgFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".svg"),
  );

  const exports = [];
  for (const file of svgFiles) {
    const componentName = `Stratis${toPascalCase(file.name)}Icon`;
    const source = await fs.readFile(path.join(inputDir, file.name), "utf8");
    const { attributes, inner } = extractSvgParts(source);
    const viewBox = resolveViewBox(attributes);
    const prefersStroke = /\bstroke="/.test(source) || !/\bfill="/.test(source);

    let svgMarkup = `<svg viewBox="${viewBox}" className="block" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
    svgMarkup = normalizeAttributes(svgMarkup);
    svgMarkup = normalizePaint(svgMarkup, prefersStroke);
    const { markup, usesIds } = uniquifyIds(svgMarkup);

    await fs.writeFile(
      path.join(outputDir, `${componentName}.tsx`),
      buildComponentSource(componentName, markup, usesIds),
      "utf8",
    );

    exports.push(`export { ${componentName} } from './${componentName}';`);
    exports.push(
      `export type { ${componentName}Props } from './${componentName}';`,
    );
  }

  await fs.writeFile(
    path.join(outputDir, "index.ts"),
    `${exports.join("\n")}\n`,
    "utf8",
  );
  console.log(`Generated ${svgFiles.length} Stratis icon component(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
