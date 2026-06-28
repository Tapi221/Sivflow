import { notify } from '@affine/component';
import {
  AuthContainer,
  AuthContent,
  AuthFooter,
  AuthHeader,
  AuthInput,
} from '@affine/component/auth-components';
import { Button } from '@affine/component/ui/button';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import {
  AuthService,
  CaptchaService,
  ServerService,
} from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { Unreachable } from '@affine/env/constant';
import { UserFriendlyError } from '@affine/error';
import { useLiveData, useService } from '@toeverything/infra';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

import type { SignInState } from '.';
import { Back } from './back';
import { Captcha } from './captcha';

export const SignInWithPasswordStep = ({
  state,
  changeState,
  onAuthenticated,
}: {
  state: SignInState;
  changeState: Dispatch<SetStateAction<SignInState>>;
  onAuthenticated?: (status: AuthSessionStatus) => void;
}) => {
  const authService = useService(AuthService);

  const email = state.email;

  if (!email) {
    throw new Unreachable();
  }

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorHint, setPasswordErrorHint] = useState('パスワードを確認してください');
  const captchaService = useService(CaptchaService);
  const serverService = useService(ServerService);
  const serverName = useLiveData(
    serverService.server.config$.selector(c => c.serverName)
  );

  const verifyToken = useLiveData(captchaService.verifyToken$);
  const needCaptcha = useLiveData(captchaService.needCaptcha$);
  const challenge = useLiveData(captchaService.challenge$);
  const [isLoading, setIsLoading] = useState(false);

  const loginStatus = useLiveData(authService.session.status$);

  useEffect(() => {
    if (loginStatus === 'authenticated') {
      notify.success({
        title: 'ログインしました',
        message: 'Sivflow にログインしました。',
      });
    }
    onAuthenticated?.(loginStatus);
  }, [loginStatus, onAuthenticated]);

  const onSignIn = useAsyncCallback(async () => {
    if (isLoading || (!verifyToken && needCaptcha)) return;
    setIsLoading(true);

    try {
      await authService.signInPassword({
        email,
        password,
        verifyToken,
        challenge,
      });
    } catch (err) {
      console.error(err);
      const error = UserFriendlyError.fromAny(err);

      setPasswordError(true);
      setPasswordErrorHint(error.message || 'メールアドレスまたはパスワードが正しくありません');
      captchaService.revalidate();
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    verifyToken,
    needCaptcha,
    captchaService,
    authService,
    email,
    password,
    challenge,
  ]);

  return (
    <AuthContainer>
      <AuthHeader title="ログイン" subTitle={serverName} />

      <AuthContent>
        <form
          onSubmit={event => {
            event.preventDefault();
            onSignIn();
          }}
        >
          <AuthInput
            label="メールアドレス"
            readOnly={true}
            value={email}
            type="email"
            name="username"
            autoComplete="username"
          />
          <AuthInput
            autoFocus
            data-testid="password-input"
            label="パスワード"
            value={password}
            type="password"
            name="password"
            autoComplete="current-password"
            onChange={(value: string) => {
              setPassword(value);
              if (passwordError) {
                setPasswordError(false);
                setPasswordErrorHint('パスワードを確認してください');
              }
            }}
            error={passwordError}
            errorHint={passwordErrorHint}
            onEnter={onSignIn}
          />
          {!verifyToken && needCaptcha && <Captcha />}
          <Button
            data-testid="sign-in-button"
            variant="primary"
            size="extraLarge"
            style={{ width: '100%' }}
            disabled={isLoading || (!verifyToken && needCaptcha)}
          >
            ログイン
          </Button>
        </form>
      </AuthContent>
      <AuthFooter>
        <Back changeState={changeState} />
      </AuthFooter>
    </AuthContainer>
  );
};
