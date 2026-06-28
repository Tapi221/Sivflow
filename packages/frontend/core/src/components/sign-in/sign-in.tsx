import { Button, notify } from '@affine/component';
import {
  AuthContainer,
  AuthContent,
  AuthFooter,
  AuthHeader,
  AuthInput,
} from '@affine/component/auth-components';
import { OAuth } from '@affine/core/components/affine/auth/oauth';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { AuthService, ServerService } from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { isFirebaseAuthConfigured } from '@affine/core/modules/cloud/utils/firebase-auth';
import { ServerDeploymentType } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { ArrowRightBigIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useState,
} from 'react';

import { useSelfhostLoginVersionGuard } from '../hooks/affine/use-selfhost-login-version-guard';
import type { SignInState } from '.';
import { Back } from './back';
import * as style from './style.css';

const emailRegex =
  /^(?:(?:[^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|((?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function validateEmail(email: string) {
  return emailRegex.test(email);
}

export const SignInStep = ({
  state,
  changeState,
  onAuthenticated,
}: {
  state: SignInState;
  changeState: Dispatch<SetStateAction<SignInState>>;
  onSkip: () => void;
  onAuthenticated?: (status: AuthSessionStatus) => void;
}) => {
  const t = useI18n();
  const serverService = useService(ServerService);
  const serverName = useLiveData(
    serverService.server.config$.selector(c => c.serverName)
  );
  const versionError = useSelfhostLoginVersionGuard(serverService.server);
  const isSelfhosted = useLiveData(
    serverService.server.config$.selector(
      c => c.type === ServerDeploymentType.Selfhosted
    )
  );
  const authService = useService(AuthService);
  const [isMutating, setIsMutating] = useState(false);
  const [email, setEmail] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(true);
  const loginStatus = useLiveData(authService.session.status$);
  const firebaseAuthConfigured = isFirebaseAuthConfigured();

  useEffect(() => {
    if (loginStatus === 'authenticated') {
      notify.success({
        title: 'ログインしました',
        message: 'Sivflow にログインしました。',
      });
    }
    onAuthenticated?.(loginStatus);
  }, [loginStatus, onAuthenticated]);

  const onContinue = useAsyncCallback(async () => {
    if (!validateEmail(email)) {
      setIsValidEmail(false);
      return;
    }

    setIsValidEmail(true);

    if (firebaseAuthConfigured) {
      changeState(prev => ({
        ...prev,
        email,
        step: 'signInWithPassword',
        hasPassword: true,
      }));
      return;
    }

    setIsMutating(true);
    try {
      const { methods } = await authService.checkUserByEmail(email);
      if (methods.password.available) {
        changeState(prev => ({
          ...prev,
          email,
          step: 'signInWithPassword',
          hasPassword: true,
        }));
        return;
      }

      notify.error({
        title: 'ログインできませんでした',
        message: 'このログイン画面では Firebase Auth が設定されていません。',
      });
    } catch (err: any) {
      console.error(err);
      notify.error({
        title: 'ログインできませんでした',
        message: err.message,
      });
    } finally {
      setIsMutating(false);
    }
  }, [authService, changeState, email, firebaseAuthConfigured]);

  if (versionError && isSelfhosted) {
    return (
      <AuthContainer>
        <AuthHeader title="ログイン" subTitle={serverName} />
        <AuthContent>
          <div>{versionError}</div>
        </AuthContent>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <AuthHeader title="ログイン" subTitle={serverName} />

      <AuthContent>
        <OAuth redirectUrl={state.redirectUrl} />

        <form
          onSubmit={event => {
            event.preventDefault();
            onContinue();
          }}
        >
          <AuthInput
            className={style.authInput}
            label="メールアドレス"
            placeholder="メールアドレスを入力"
            onChange={setEmail}
            error={!isValidEmail}
            errorHint={isValidEmail ? '' : '有効なメールアドレスを入力してください'}
            onEnter={onContinue}
            type="email"
            name="username"
            autoComplete="username"
          />

          <Button
            className={style.signInButton}
            style={{ width: '100%' }}
            size="extraLarge"
            data-testid="continue-login-button"
            block
            loading={isMutating}
            disabled={isMutating}
            suffix={<ArrowRightBigIcon />}
            suffixStyle={{ width: 20, height: 20, color: cssVar('blue') }}
          >
            メールで続行
          </Button>
        </form>
      </AuthContent>
      {isSelfhosted && (
        <AuthFooter>
          <Back changeState={changeState} />
        </AuthFooter>
      )}
    </AuthContainer>
  );
};
