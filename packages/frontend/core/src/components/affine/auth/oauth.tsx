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

function isFirebaseConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('Firebase Auth config is missing')
  );
}

function notifyOAuthError(error: unknown) {
  if (isFirebaseConfigError(error)) {
    notify.error({
      title: 'Google login is not configured',
      message:
        'Set BUILD_CONFIG.firebaseAuth or VITE_FIREBASE_* env vars before using Google sign-in.',
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
      Continue with Google
    </Button>
  );
}
