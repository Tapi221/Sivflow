import { installSivflowCssVariableAliases } from '@blocksuite/affine-shared/theme';

import { DatePicker } from './date-picker.js';

export * from './date-picker.js';

export function effects() {
  installSivflowCssVariableAliases();
  customElements.define('date-picker', DatePicker);
}
