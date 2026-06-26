import { Button } from '@affine/component/ui/button';
import { notify } from '@affine/component/ui/notification';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import {
  AuthService,
  FetchService,
  ServerService,
} from '@affine/core/modules/cloud';
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

type FirebaseAuthConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

function getFirebaseEnvConfig(): Partial<FirebaseAuthConfig> {
  const env = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return {
    apiKey: env?.VITE_FIREBASE_API_KEY,
    authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env?.VITE_FIREBASE_PROJECT_ID,
    appId: env?.VITE_FIREBASE_APP_ID,
    storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
}

function getFirebaseAuthConfig() {
  const buildConfig = BUILD_CONFIG as typeof BUILD_CONFIG & {
    firebase?: Partial<FirebaseAuthConfig>;
    firebaseAuth?: Partial<FirebaseAuthConfig>;
  };
  const config =
    buildConfig.firebaseAuth ?? buildConfig.firebase ?? getFirebaseEnvConfig();

  if (
    !config?.apiKey ||
    !config.authDomain ||
    !config.projectId ||
    !config.appId
  ) {
    throw new Error(
      'Firebase Auth config is missing. Set BUILD_CONFIG.firebaseAuth or VITE_FIREBASE_* env vars.'
    );
  }

  return config as FirebaseAuthConfig;
}

async function getFirebaseAuth() {
  const [{ getApps, initializeApp }, { getAuth }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps()[0] ?? initializeApp(getFirebaseAuthConfig());
  return getAuth(app);
}

export function OAuth({ redirectUrl }: { redirectUrl?: string }) {
  const serverService = useService(ServerService);
  const urlService = useService(UrlService);
  const auth = useService(AuthService);
  const fetchService = useService(FetchService);
  const oauth = useLiveData(serverService.server.features$.map(r => r?.oauth));
  const oauthProviders = useLiveData(
    serverService.server.config$.map(r => r?.oauthProviders)
  );

  const onContinue = useAsyncCallback(
    async (provider: OAuthProviderType) => {
      track.$.$.auth.signIn({ method: 'oauth', provider });

      try {
        const { GoogleAuthProvider, signInWithPopup } = await import(
          'firebase/auth'
        );

        if (provider === OAuthProviderType.Google) {
          const authInstance = await getFirebaseAuth();
          const googleProvider = new GoogleAuthProvider();
          const credential = await signInWithPopup(authInstance, googleProvider);
          const token = await credential.user.getIdToken();

          await fetchService.fetch('/api/auth/firebase', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          auth.session.revalidate();

          if (redirectUrl) {
            urlService.openExternal(redirectUrl);
          }
        } else {
          notify.error({
            title: 'Not Implemented',
            message: `Provider ${provider} is not supported yet.`,
          });
        }
      } catch (e) {
        notify.error(UserFriendlyError.fromAny(e));
      }
    },
    [auth, fetchService, urlService, redirectUrl]
  );

  if (!oauth) {
    return null;
  }

  return oauthProviders?.map(provider => {
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
