import { Button } from "@affine/component/ui/button";
import { notify } from "@affine/component/ui/notification";
import { useAsyncCallback } from "@affine/core/components/hooks/affine-async-hooks";
import { AuthService } from "@affine/core/modules/cloud";
import {
  clearPendingFirebaseRedirectSignIn,
  getFirebaseAuth,
  isFirebaseAuthConfigured,
  markPendingFirebaseRedirectSignIn,
} from "@affine/core/modules/cloud/utils/firebase-auth";
import { GlobalContextService } from "@affine/core/modules/global-context";
import { UserFriendlyError } from "@affine/error";
import { OAuthProviderType } from "@affine/graphql";
import track from "@affine/track";
import { GoogleIcon } from "@blocksuite/icons/rc";
import { useLiveData, useService } from "@toeverything/infra";
import { useCallback } from "react";

type OAuthWindow = Window & {
  currentWorkspace?: {
    flavour?: string;
  };
};

function getFirebaseErrorCode(error: unknown) {
  return error instanceof Error && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function notifyOAuthError(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/unauthorized-domain") {
    notify.error({
      title: "Firebase Auth のドメインが許可されていません",
      message:
        "Firebase Console の Authentication > Settings > Authorized domains に localhost または 127.0.0.1 を追加してください。",
    });
    return;
  }

  if (code === "auth/operation-not-allowed") {
    notify.error({
      title: "Googleログインが無効です",
      message:
        "Firebase Console の Authentication > Sign-in method で Google を有効にしてください。",
    });
    return;
  }

  if (code === "auth/popup-closed-by-user") {
    notify.error({
      title: "Googleログインが閉じられました",
      message:
        "Googleログイン画面が閉じられました。もう一度開いて最後まで進めてください。",
    });
    return;
  }

  if (
    error instanceof Error &&
    error.message.includes("Firebase Auth config is missing")
  ) {
    notify.error({
      title: "Googleログインが設定されていません",
      message:
        "BUILD_CONFIG.firebaseAuth または VITE_FIREBASE_* の環境変数を設定してください。",
    });
    return;
  }

  notify.error(UserFriendlyError.fromAny(error));
}

function getFirebaseRedirectResumeUrl(
  redirectUrl?: string,
  currentWorkspaceFlavour?: string | null,
) {
  if (redirectUrl) {
    return redirectUrl;
  }

  if (currentWorkspaceFlavour === "local") {
    return "/?initCloud=true";
  }

  if (typeof window !== "undefined") {
    const currentWorkspace = (window as OAuthWindow).currentWorkspace;

    if (currentWorkspace?.flavour === "local") {
      return "/?initCloud=true";
    }
  }

  return undefined;
}

export function OAuth({ redirectUrl }: { redirectUrl?: string }) {
  const authService = useService(AuthService);
  const globalContextService = useService(GlobalContextService);
  const currentWorkspaceFlavour = useLiveData(
    globalContextService.globalContext.workspaceFlavour.$,
  );
  const onContinue = useAsyncCallback(async () => {
    track.$.$.auth.signIn({
      method: "oauth",
      provider: OAuthProviderType.Google,
    });

    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
        await import("firebase/auth");
      const authInstance = await getFirebaseAuth();
      const googleProvider = new GoogleAuthProvider();
      const resumeUrl = getFirebaseRedirectResumeUrl(
        redirectUrl,
        currentWorkspaceFlavour,
      );

      try {
        const credential = await signInWithPopup(authInstance, googleProvider);
        const token = await credential.user.getIdToken();

        await authService.signInFirebaseToken(token);

        track.$.$.auth.signedIn({
          method: "oauth",
          provider: OAuthProviderType.Google,
        });

        if (resumeUrl) {
          if (resumeUrl.toUpperCase() === "CLOSE_POPUP") {
            window.close();
            return;
          }

          const nextUrl = new URL(resumeUrl, window.location.origin);

          if (nextUrl.toString() !== window.location.href) {
            window.location.replace(nextUrl.toString());
          }
        }
        return;
      } catch (popupError) {
        const popupErrorCode = getFirebaseErrorCode(popupError);

        if (
          popupErrorCode !== "auth/popup-blocked" &&
          popupErrorCode !== "auth/operation-not-supported-in-this-environment"
        ) {
          throw popupError;
        }
      }

      markPendingFirebaseRedirectSignIn(resumeUrl);
      await signInWithRedirect(authInstance, googleProvider);
    } catch (e) {
      clearPendingFirebaseRedirectSignIn();
      console.error(e);
      notifyOAuthError(e);
    }
  }, [authService, currentWorkspaceFlavour, redirectUrl]);

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
      style={{ width: "100%" }}
      prefix={<GoogleIcon />}
      onClick={onClick}
    >
      Googleで続行
    </Button>
  );
}
