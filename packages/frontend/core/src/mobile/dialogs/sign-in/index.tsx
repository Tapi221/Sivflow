import { IconButton, Modal, SafeArea } from '@affine/component';
import type { SignInStep } from '@affine/core/components/sign-in';
import type {
  DialogComponentProps,
  GLOBAL_DIALOG_SCHEMA,
} from '@affine/core/modules/dialogs';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { CloseIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';

import { MobileSignInPanel } from '../../components/sign-in';

export const SignInDialog = ({
  close,
  server: initialServerBaseUrl,
  step,
  redirectUrl,
}: DialogComponentProps<GLOBAL_DIALOG_SCHEMA['sign-in']>) => {
  const globalContextService = useService(GlobalContextService);
  const currentWorkspaceFlavour = useLiveData(
    globalContextService.globalContext.workspaceFlavour.$
  );
  const resolvedRedirectUrl =
    redirectUrl ??
    (currentWorkspaceFlavour === 'local' ? '/?initCloud=true' : undefined);
  return (
    <Modal
      fullScreen
      animation="slideBottom"
      open
      onOpenChange={() => close()}
      contentOptions={{
        style: {
          padding: 0,
          overflowY: 'auto',
          backgroundColor: cssVarV2('layer/background/secondary'),
        },
      }}
      withoutCloseButton
    >
      <MobileSignInPanel
        onClose={close}
        server={initialServerBaseUrl}
        initStep={step as SignInStep}
        redirectUrl={resolvedRedirectUrl}
      />
      <SafeArea
        top
        style={{ position: 'absolute', top: 0, right: 0, paddingRight: 16 }}
        topOffset={8}
      >
        <IconButton
          size="24"
          variant="solid"
          icon={<CloseIcon />}
          style={{ borderRadius: 8, padding: 4 }}
          onClick={e => {
            e.stopPropagation();
            close();
          }}
        />
      </SafeArea>
    </Modal>
  );
};
