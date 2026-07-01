import { css, unsafeCSS } from 'lit';

import { unsafeCSSVarV2 } from '../theme/css-variables';
import { fontSMStyle } from './font';

export const panelBaseColorsStyle = (container: string) => css`
  ${unsafeCSS(container)} {
    color: var(--sivflow-icon-color);
    box-shadow: var(--sivflow-menu-shadow);
    background: ${unsafeCSSVarV2('layer/background/overlayPanel')};
  }

  @supports (background: color-mix(in srgb, white 80%, transparent)) {
    ${unsafeCSS(container)} {
      background: color-mix(
        in srgb,
        ${unsafeCSSVarV2('layer/background/overlayPanel')} 76%,
        transparent
      );
    }
  }

  @supports (backdrop-filter: blur(12px)) {
    ${unsafeCSS(container)} {
      backdrop-filter: blur(12px);
    }
  }

  @supports (-webkit-backdrop-filter: blur(12px)) {
    ${unsafeCSS(container)} {
      -webkit-backdrop-filter: blur(12px);
    }
  }
`;

export const panelBaseStyle = (container: string) => css`
  ${unsafeCSS(container)} {
    display: flex;
    align-items: center;
    gap: 8px;
    width: max-content;
    padding: 0 6px;
    border-radius: 8px;
    border: 0.5px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
  }
  ${panelBaseColorsStyle(container)}
  ${fontSMStyle(container)}
`;