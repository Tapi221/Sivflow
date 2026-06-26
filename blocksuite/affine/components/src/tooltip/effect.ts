import { installSivflowCssVariableAliases } from '@blocksuite/affine-shared/theme';

import { Tooltip } from './tooltip.js';

export function effects() {
  installSivflowCssVariableAliases();

  if (!customElements.get('affine-tooltip')) {
    customElements.define('affine-tooltip', Tooltip);
  }
}
