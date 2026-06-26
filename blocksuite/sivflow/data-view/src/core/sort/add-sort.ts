import {
  menu,
  popMenu,
  type PopupTarget,
} from '@blocksuite/affine-components/context-menu';
import type { Middleware } from '@floating-ui/dom';

import { renderUniLit } from '../utils/index.js';
import type { SortUtils } from './utils.js';
import { I18n } from '@affine/i18n';

export const popCreateSort = (
  target: PopupTarget,
  props: {
    sortUtils: SortUtils;
    onClose?: () => void;
    onBack?: () => void;
  },
  ops?: {
    middleware?: Middleware[];
  }
) => {
  const subHandler = popMenu(target, {
    middleware: ops?.middleware,
    options: {
      onClose: props.onClose,
      title: {
        text: I18n.t('com.affine.data-view.sort.new-sort') || 'New sort',
        onBack: props.onBack,
      },
      items: [
        menu.group({
          items: props.sortUtils.vars$.value
            .filter(
              v =>
                !props.sortUtils.sortList$.value.some(
                  sort => sort.ref.name === v.id
                )
            )
            .map(v =>
              menu.action({
                name: v.name,
                prefix: renderUniLit(v.icon, {}),
                select: () => {
                  props.sortUtils.add({
                    ref: {
                      type: 'ref',
                      name: v.id,
                    },
                    desc: false,
                  });
                },
              })
            ),
        }),
      ],
    },
  });
  subHandler.menu.menuElement.style.minHeight = '550px';
};
