import { I18n } from '@affine/i18n';
import { I18nExtension } from '@blocksuite/affine-shared/services';
import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine/ext-loader';

export class AffineI18nViewExtension extends ViewExtensionProvider {
  override name = 'affine-view-i18n';

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register(
      I18nExtension({
        t: (key, options) => I18n.t(key, options),
      })
    );
  }
}
