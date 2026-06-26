import { menu } from '@blocksuite/affine-components/context-menu';
import { I18nStringProvider } from '@blocksuite/affine-shared/services';
import { html } from 'lit/static-html.js';

import { renderUniLit } from '../utils/uni-component/index.js';
import type { Property } from '../view-manager/property.js';

export const inputConfig = (property: Property) => {
  const i18n = property.view.serviceGet(I18nStringProvider);
  const t = (key: string, fallback: string) => i18n?.t(key) ?? fallback;

  return menu.input({
    prefix: html`
      <div class="affine-database-column-type-menu-icon">
        ${renderUniLit(property.icon)}
      </div>
    `,
    initialValue: property.name$.value,
    placeholder: t('com.affine.data-view.property-menu.property-name', 'Property name'),
    onBlur: text => {
      property.nameSet(text);
    },
  });
};
export const typeConfig = (property: Property) => {
  const i18n = property.view.serviceGet(I18nStringProvider);
  const t = (key: string, fallback: string) => i18n?.t(key) ?? fallback;

  return menu.group({
    items: [
      menu.subMenu({
        name: t('com.affine.data-view.property-menu.type', 'Type'),
        hide: () => !property.typeCanSet,
        postfix: html` <div
          class="affine-database-column-type-icon"
          style="color: var(--affine-text-secondary-color);gap:4px;font-size: 14px;"
        >
          ${renderUniLit(property.icon)}
          ${(() => {
            const propMeta = property.view.propertyMetas$.value.find(
              v => v.type === property.type$.value
            );
            if (!propMeta) return '';
            return t(`com.affine.data-view.property-type.${propMeta.type}`, propMeta.config.name);
          })()}
        </div>`,
        options: {
          title: {
            text: t('com.affine.data-view.property-menu.property-type', 'Property type'),
          },
          items: [
            menu.group({
              items: property.view.propertyMetas$.value.map(config => {
                return menu.action({
                  isSelected: config.type === property.type$.value,
                  name: t(`com.affine.data-view.property-type.${config.type}`, config.config.name),
                  prefix: renderUniLit(config.renderer.icon),
                  select: () => {
                    if (property.type$.value === config.type) {
                      return;
                    }
                    property.typeSet?.(config.type);
                  },
                });
              }),
            }),
          ],
        },
      }),
    ],
  });
};
