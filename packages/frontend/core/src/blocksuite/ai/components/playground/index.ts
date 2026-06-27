import { PlaygroundChat } from './chat';
import { PlaygroundContent } from './content';
import { PlaygroundModal } from './modal';

function defineElement(tagName: string, elementClass: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass);
  }
}

export function effects() {
  defineElement('playground-chat', PlaygroundChat);
  defineElement('playground-content', PlaygroundContent);
  defineElement('playground-modal', PlaygroundModal);
}
