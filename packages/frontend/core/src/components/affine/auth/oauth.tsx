import { Button } from '@affine/component/ui/button';
import { notify } from '@affine/component/ui/notification';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService } from '@affine/core/modules/cloud';
import {
  getFirebaseAuth,
  isFirebaseAuthConfigured,
} from '@affine/core/modules/cloud/utils/firebase-auth';
import { UrlService } from '@affine/core/modules/url';
import { UserFriendlyError } from '@affine/error';
import { OAuthProviderType } from '@affine/graphql';
import track from '@affine/track';
import { GoogleIcon } from '@blocksuite/icons/rc';
import { useService } from '@toeverything/infra';
import { useCallback } from 'react';

function getFirebaseErrorCode(error: unknown) {
  return error instanceof Error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function notifyOAuthError(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === 'auth/unauthorized-domain') {
    notify.error({
      title: 'Firebase Auth のドメインが許可されていません',
      message:
        'Firebase Console の Authentication > Settings > Authorized domains に localhost または 127.0.0.1 を追加してください。',
    });
    return;
  }

  if (code === 'auth/operation-not-allowed') {
    notify.error({
      title: 'Googleログインが無効です',
      message:
        'Firebase Console の Authentication > Sign-in method で Google を有効にしてください。',
    });
    return;
  }

  if (code === 'auth/popup-closed-by-user') {
    notify.error({
      title: 'Googleログインが閉じられました',
      message:
        'Googleログイン画面が閉じられました。もう一度開いて最後まで進めてください。',
    });
    return;
  }

  if (
    error instanceof Error &&
    error.message.includes('Firebase Auth config is missing')
  ) {
    notify.error({
      title: 'Googleログインが設定されていません',
      message:
        'BUILD_CONFIG.firebaseAuth または VITE_FIREBASE_* の環境変数を設定してください。',
    });
    return;
  }

  notify.error(UserFriendlyError.fromAny(error));
}

export function OAuth({ redirectUrl }: { redirectUrl?: string }) {
  const urlService = useService(UrlService);
  const auth = useService(AuthService);

  const onContinue = useAsyncCallback(async () => {
    track.$.$.auth.signIn({
      method: 'oauth',
      provider: OAuthProviderType.Google,
    });

    try {
      const { GoogleAuthProvider, signInWithPopup } = await import(
        'firebase/auth'
      );
      const authInstance = await getFirebaseAuth();
      const googleProvider = new GoogleAuthProvider();
      const credential = await signInWithPopup(authInstance, googleProvider);
      const token = await credential.user.getIdToken();

      await auth.signInFirebaseToken(token);
      track.$.$.auth.signedIn({
        method: 'oauth',
        provider: OAuthProviderType.Google,
      });

      if (redirectUrl) {
        urlService.openExternal(redirectUrl);
      }
    } catch (e) {
      console.error(e);
      notifyOAuthError(e);
    }
  }, [auth, urlService, redirectUrl]);

  if (!isFirebaseAuthConfigured()) {
    return null;
  }

  return <FirebaseGoogleProvider onContinue={onContinue} />;
}

function FirebaseGoogleProvider({ onContinue }: { onContinue: () => void }) {
  const onClick = useCallback(() => {
    onContinue();
  }, [onContinue]);

  return (
    <Button
      block
      size="extraLarge"
      style={{ width: '100%' }}
      prefix={<GoogleIcon />}
      onClick={onClick}
    >
      Googleで続行
    </Button>
  );
}
