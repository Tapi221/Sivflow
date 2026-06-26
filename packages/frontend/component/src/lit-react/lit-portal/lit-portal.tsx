import { html, LitElement, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

type P\u006frtalEvent = {
  name: 'connectedCallback' | 'disconnectedCallback' | 'willUpdate';
  target: LitReactP\u006frtal;
};

type P\u006frtalListener = (event: P\u006frtalEvent) => void;

function createLitP\u006frtalAnchor(callback: (event: P\u006frtalEvent) => void) {
  return html`<lit-react-\u0070ortal
    .notify=${callback}
    \u0070ortalId=${nanoid()}
  ></lit-react-\u0070ortal>`;
}

export const LIT_REACT_PORTAL = 'lit-react-\u0070ortal';

class LitReactP\u006frtal extends LitElement {
  \u0070ortalId!: string;
  notify?: P\u006frtalListener;

  static override get properties() {
    return {
      \u0070ortalId: { type: String },
      notify: { attribute: false },
    };
  }

  override connectedCallback() {
    super.connectedCallback();
    this.notify?.({
      name: 'connectedCallback',
      target: this,
    });
  }

  override attributeChangedCallback(
    name: string,
    oldVal: string,
    newVal: string
  ) {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name.toLowerCase() === '\u0070ortalid') {
      this.notify?.({
        name: 'willUpdate',
        target: this,
      });
    }
  }

  // do not enable shadow root
  override createRenderRoot() {
    return this;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.notify?.({
      name: 'disconnectedCallback',
      target: this,
    });
  }
}

customElement(LIT_REACT_PORTAL)(LitReactP\u006frtal);

declare global {
  interface HTMLElementTagNameMap {
    [LIT_REACT_PORTAL]: LitReactP\u006frtal;
  }
}

export type ElementOrFactory = React.ReactNode | (() => React.ReactNode);

type LitP\u006frtal = {
  id: string;
  \u0070ortal: React.ReactP\u006frtal;
  litElement: LitReactP\u006frtal;
};

export type ReactToLit = (
  elementOrFactory: ElementOrFactory,
  rerendering?: boolean
) => TemplateResult;

// returns a factory function that renders a given element to a lit template
export const useLitP\u006frtalFactory = () => {
  const [\u0070ortals, setP\u006frtals] = useState<LitP\u006frtal[]>([]);

  const reactToLit: ReactToLit = useCallback(
    (elementOrFactory, rerendering) => {
      const element =
        typeof elementOrFactory === 'function'
          ? elementOrFactory()
          : elementOrFactory;
      return createLitP\u006frtalAnchor(event => {
        setP\u006frtals(\u0070ortals => {
          const { name, target } = event;
          const id = target.\u0070ortalId;
          let newP\u006frtals = \u0070ortals;
          const updateP\u006frtals = () => {
            let oldP\u006frtalIndex = \u0070ortals.findIndex(
              p => p.litElement === target
            );
            oldP\u006frtalIndex =
              oldP\u006frtalIndex === -1 ? \u0070ortals.length : oldP\u006frtalIndex;
            newP\u006frtals = \u0070ortals.toSpliced(oldP\u006frtalIndex, 1, {
              id,
              \u0070ortal: ReactDOM.createP\u006frtal(element, target),
              litElement: target,
            });
          };
          switch (name) {
            case 'connectedCallback':
              updateP\u006frtals();
              break;
            case 'disconnectedCallback':
              newP\u006frtals = \u0070ortals.filter(p => p.litElement.isConnected);
              break;
            case 'willUpdate':
              if (!target.isConnected || !rerendering) {
                break;
              }
              updateP\u006frtals();
              break;
          }
          return newP\u006frtals;
        });
      });
    },
    []
  );

  return [reactToLit, \u0070ortals] as const;
};

// render a react element to a lit template
export const useLitP\u006frtal = (elementOrFactory: ElementOrFactory) => {
  const [anchor, setAnchor] = useState<HTMLElement>();
  const template = useMemo(
    () =>
      createLitP\u006frtalAnchor(event => {
        let anchor: HTMLElement | undefined;
        if (event.name !== 'disconnectedCallback') {
          anchor = event.target as HTMLElement;
        }
        setAnchor(anchor);
      }),
    []
  );

  const element = useMemo(
    () =>
      typeof elementOrFactory === 'function'
        ? elementOrFactory()
        : elementOrFactory,
    [elementOrFactory]
  );
  return {
    template,
    \u0070ortal: anchor ? ReactDOM.createP\u006frtal(element, anchor) : undefined,
  };
};
