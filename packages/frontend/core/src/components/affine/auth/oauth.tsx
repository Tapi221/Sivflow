import { Button } from '@affine/component/ui/button';
import { notify } from '@affine/component/ui/notification';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService, ServerService } from '@affine/core/modules/cloud';
import {
  getFirebaseAuth,
  isFirebaseAuthConfigured,
} from '@affine/core/modules/cloud/utils/firebase-auth';
import { UrlService } from '@affine/core/modules/url';
import { UserFriendlyError } from '@affine/error';
import { OAuthProviderType } from '@affine/graphql';
import track from '@affine/track';
import {
  AppleIcon,
  GithubIcon,
  GoogleIcon,
  LockIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { type ReactElement, type SVGAttributes, useCallback } from 'react';

const OAuthProviderMap: Record<
  OAuthProviderType,
  {
    icon: ReactElement<SVGAttributes<SVGElement>>;
  }
> = {
  [OAuthProviderType.Google]: {
    icon: <GoogleIcon />,
  },

  [OAuthProviderType.GitHub]: {
    icon: <GithubIcon />,
  },

  [OAuthProviderType.OIDC]: {
    icon: <LockIcon />,
  },

  [OAuthProviderType.Apple]: {
    icon: <AppleIcon />,
  },
};

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
  const serverService = useService(ServerService);
  const urlService = useService(UrlService);
  const auth = useService(AuthService);
  const oauth = useLiveData(serverService.server.features$.map(r => r?.oauth));
  const oauthProviders = useLiveData(
    serverService.server.config$.map(r => r?.oauthProviders)
  );
  const firebaseAuthConfigured = isFirebaseAuthConfigured();
  const providers = Array.from(
    new Set([
      ...(oauth ? (oauthProviders ?? []) : []),
      ...(firebaseAuthConfigured ? [OAuthProviderType.Google] : []),
    ])
  );

  const onContinue = useAsyncCallback(
    async (provider: OAuthProviderType) => {
      track.$.$.auth.signIn({ method: 'oauth', provider });

      try {
        if (provider === OAuthProviderType.Google && firebaseAuthConfigured) {
          const { GoogleAuthProvider, signInWithPopup } = await import(
            'firebase/auth'
          );
          const authInstance = await getFirebaseAuth();
          const googleProvider = new GoogleAuthProvider();
          const credential = await signInWithPopup(authInstance, googleProvider);
          const token = await credential.user.getIdToken();

          await auth.signInFirebaseToken(token);
          track.$.$.auth.signedIn({ method: 'oauth', provider });

          if (redirectUrl) {
            urlService.openExternal(redirectUrl);
          }
          return;
        }

        const nativeClient = urlService.getClientScheme();
        if (nativeClient) {
          const { url } = await auth.oauthPreflight(
            provider,
            nativeClient,
            redirectUrl
          );
          urlService.openExternal(url);
          return;
        }

        notify.error({
          title: 'Not Implemented',
          message: `Provider ${provider} is not supported without Firebase Auth.`,
        });
      } catch (e) {
        notifyOAuthError(e);
      }
    },
    [auth, firebaseAuthConfigured, urlService, redirectUrl]
  );

  if (providers.length === 0) {
    return null;
  }

  return providers.map(provider => {
    return (
      <OAuthProvider
        key={provider}
        provider={provider}
        onContinue={onContinue}
      />
    );
  });
}

interface OauthProviderProps {
  provider: OAuthProviderType;
  onContinue: (provider: OAuthProviderType) => void;
}

function OAuthProvider({ onContinue, provider }: OauthProviderProps) {
  const { icon } =
    provider in OAuthProviderMap
      ? OAuthProviderMap[provider]
      : { icon: undefined };

  const onClick = useCallback(() => {
    onContinue(provider);
  }, [onContinue, provider]);

  return (
    <Button
      variant={provider === OAuthProviderType.Apple ? 'custom' : 'primary'}
      block
      size="extraLarge"
      style={{ width: '100%' }}
      prefix={icon}
      onClick={onClick}
    >
      Continue with {provider}
    </Button>
  );
}
