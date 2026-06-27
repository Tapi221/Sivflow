import { AIItem } from './ai-item';
import { AIItemList } from './ai-item-list';
import { AISubItemList } from './ai-sub-item-list';

export * from './ai-item-list.js';
export * from './types.js';

function defineElement(tagName: string, elementClass: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass);
  }
}

export function effects() {
  defineElement('ai-item-list', AIItemList);
  defineElement('ai-item', AIItem);
  defineElement('ai-sub-item-list', AISubItemList);
}
