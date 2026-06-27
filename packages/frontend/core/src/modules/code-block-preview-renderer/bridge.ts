import {
  renderMermaidSvgBackend,
  renderTypstSvgBackend,
} from '@affine/core/modules/code-block-preview-renderer/platform-backend';
import type {
  MermaidRenderRequest,
  MermaidRenderResult,
} from '@affine/core/modules/mermaid/renderer';
import type {
  TypstRenderRequest,
  TypstRenderResult,
} from '@affine/core/modules/typst/renderer';
import type { Config } from 'dompurify';
import DOMPurify from 'dompurify';

/** Mermaid SVG uses `<use>`, `<style>`, and sometimes `<foreignObject>` for labels. */
const MERMAID_SVG_SANITIZE_CONFIG: Config = {
  USE_PROFILES: { svg: true },
  ADD_TAGS: ['use'],
  ADD_ATTR: ['href', 'xlink:href', 'class', 'style', 'id'],
};

const FOREIGN_OBJECT_HTML_SANITIZE_CONFIG: Config = {
  USE_PROFILES: { html: true },
};

function sanitizeSvgMarkup(svg: string) {
  try {
    const sanitized = DOMPurify.sanitize(svg, MERMAID_SVG_SANITIZE_CONFIG);
    if (typeof sanitized !== 'string' || !/^\s*<svg[\s>]/i.test(sanitized)) {
      return '';
    }
    return sanitized.trim();
  } catch (error) {
    console.warn('Mermaid SVGのサニタイズに失敗しました', error);
    return '';
  }
}

function sanitizeForeignObjects(root: ParentNode) {
  root.querySelectorAll('foreignObject, foreignobject').forEach(element => {
    try {
      element.innerHTML = DOMPurify.sanitize(
        element.innerHTML,
        FOREIGN_OBJECT_HTML_SANITIZE_CONFIG
      );
    } catch (error) {
      console.warn('Mermaid foreignObjectのサニタイズに失敗しました', error);
      element.textContent = '';
    }
  });
}

export function sanitizeSvg(svg: string): string {
  const sanitized = sanitizeSvgMarkup(svg);
  if (!sanitized) {
    return '';
  }

  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    return sanitized;
  }

  const parser = new DOMParser();
  const sanitizedDoc = parser.parseFromString(sanitized, 'image/svg+xml');
  const sanitizedRoot = sanitizedDoc.documentElement;
  if (!sanitizedRoot || sanitizedRoot.tagName.toLowerCase() !== 'svg') {
    return '';
  }

  sanitizeForeignObjects(sanitizedRoot);
  return new XMLSerializer().serializeToString(sanitizedRoot).trim();
}

export async function renderMermaidSvg(
  request: MermaidRenderRequest
): Promise<MermaidRenderResult> {
  const rendered = await renderMermaidSvgBackend(request);

  const sanitizedSvg = sanitizeSvg(rendered.svg);
  if (!sanitizedSvg) {
    throw new Error('Preview renderer returned invalid SVG.');
  }
  return { svg: sanitizedSvg };
}

export async function renderTypstSvg(
  request: TypstRenderRequest
): Promise<TypstRenderResult> {
  const rendered = await renderTypstSvgBackend(request);

  return { svg: rendered.svg };
}
