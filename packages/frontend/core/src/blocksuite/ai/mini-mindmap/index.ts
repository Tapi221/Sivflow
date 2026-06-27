import { MiniMindmapPreview } from './mindmap-preview.js';
import { MindmapRootBlock } from './mindmap-root-block.js';
import { MindmapSurfaceBlock } from './surface-block.js';

export { markdownToMindmap, MiniMindmapPreview } from './mindmap-preview.js';
export { MindmapRootBlock } from './mindmap-root-block.js';
export { MindmapService } from './mindmap-service.js';
export { MindmapSurfaceBlock } from './surface-block.js';

function defineMiniMindmapElement(
  tagName: string,
  elementClass: CustomElementConstructor
) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass);
  }
}

export function registerMiniMindmapBlocks() {
  defineMiniMindmapElement('mini-mindmap-root-block', MindmapRootBlock);
  defineMiniMindmapElement('mini-mindmap-preview', MiniMindmapPreview);
  defineMiniMindmapElement('mini-mindmap-surface-block', MindmapSurfaceBlock);
}
