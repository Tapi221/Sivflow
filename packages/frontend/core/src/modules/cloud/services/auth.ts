import { UserFriendlyError } from "@affine/error";
import { OAuthProviderType } from "@affine/graphql";
import { track } from "@affine/track";
import { OnEvent, Service } from "@toeverything/infra";
import { nanoid } from "nanoid";
import { distinctUntilChanged, map, skip, type Subscription } from "rxjs";

import type { GlobalDialogService } from "../../dialogs";
import { ApplicationFocused } from "../../lifecycle";
import type { NbstoreService } from "../../storage";
import type { UrlService } from "../../url";
import { AuthSession } from "../entities/session";
import { AccountChanged } from "../events/account-changed";
import { AccountLoggedIn } from "../events/account-logged-in";
import { AccountLoggedOut } from "../events/account-logged-out";
import { ServerStarted } from "../events/server-started";
import type { AuthStore } from "../stores/auth";
import {
  clearPendingFirebaseRedirectSignIn,
  FIREBASE_EMAIL_FOR_SIGN_IN_KEY,
  getFirebaseAuth,
  getPendingFirebaseRedirectSignInTarget,
  hasPendingFirebaseRedirectSignIn,
  isFirebaseAuthConfigured,
} from "../utils/firebase-auth";
import {
  createLocalDevFirebaseBackendUnavailableError,
  isLocalDevFirebaseBackendUnavailable,
} from "../utils/firebase-backend-error";
import type { FetchService } from "./fetch";

async function readResponseTextSafe(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function getWindowHostname() {
  return typeof window === "undefined" ? undefined : window.location.hostname;
}

@OnEvent(ApplicationFocused, (e) => e.onApplicationFocused)
@OnEvent(ServerStarted, (e) => e.onServerStarted)
export class AuthService extends Service {
  session = this.framework.createEntity(AuthSession);
  private profileSubscription?: Subscription;
  private firebaseRedirectSignInPromise?: Promise<void>;

  constructor(
    private readonly fetchService: FetchService,
    private readonly store: AuthStore,
    private readonly urlService: UrlService,
    private readonly dialogService: GlobalDialogService,
    private readonly nbstoreService: NbstoreService,
  ) {
    super();

    this.session.account$
      .pipe(
        map((a) => ({
          id: a?.id,
          account: a,
        })),
        distinctUntilChanged((a, b) => a.id === b.id), // only emit when the value changes
        skip(1), // skip the initial value
      )
      .subscribe(({ account }) => {
        if (account === null) {
          this.eventBus.emit(AccountLoggedOut, account);
          this.profileSubscription?.unsubscribe();
          this.profileSubscription = undefined;
        } else {
          this.eventBus.emit(AccountLoggedIn, account);
          this.subscribeProfile();
        }
        this.eventBus.emit(AccountChanged, account);
      });

    this.subscribeProfile();
    void this.ensureFirebaseRedirectSignInProcessed();
  }

  private onServerStarted() {
    void this.ensureFirebaseRedirectSignInProcessed();
    this.session.revalidate();
    this.subscribeProfile();
  }

  private onApplicationFocused() {
    void this.ensureFirebaseRedirectSignInProcessed();
    this.session.revalidate();
  }

  private subscribeProfile() {
    this.profileSubscription?.unsubscribe();
    this.profileSubscription = undefined;
    if (!this.session.account$.value) return;
    this.profileSubscription = this.nbstoreService.realtime
      .subscribe("user.profile.changed", {})
      .subscribe({
        next: () => {
          void (async () => {
            this.session.revalidate();
            await this.session.waitForRevalidation();
            this.eventBus.emit(AccountChanged, this.session.account$.value);
          })().catch(() => {});
        },
        error: () => {
          this.profileSubscription = undefined;
        },
      });
  }

  override dispose() {
    super.dispose();
    this.profileSubscription?.unsubscribe();
    this.profileSubscription = undefined;
  }

  async sendEmailMagicLink(
    email: string,
    verifyToken?: string,
    challenge?: string,
    redirectUrl?: string, // url to redirect to after signed-in
  ) {
    track.$.$.auth.signIn({ method: "magic-link" });
    // Only native clients use `client_nonce` for magic-link/otp sign-in.
    // Web needs to keep cross-device magic-link compatibility.
    const magicLinkClientNonce = BUILD_CONFIG.isNative
      ? this.setClientNonce()
      : undefined;
    try {
      if (isFirebaseAuthConfigured()) {
        await this.sendFirebaseEmailLink(email, redirectUrl);
        return;
      }

      const scheme = this.urlService.getClientScheme();
      const magicLinkUrlParams = new URLSearchParams();
      if (redirectUrl) {
        magicLinkUrlParams.set("redirect_uri", redirectUrl);
      }
      if (scheme) {
        magicLinkUrlParams.set("client", scheme);
      }
      await this.fetchService.fetch("/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email,
          // we call it [callbackUrl] instead of [redirect_uri]
          // to make it clear the url is used to finish the sign-in process instead of redirect after signed-in
          callbackUrl: `/magic-link?${magicLinkUrlParams.toString()}`,
          client_nonce: magicLinkClientNonce,
        }),
        headers: {
          "content-type": "application/json",
          ...(verifyToken ? this.captchaHeaders(verifyToken, challenge) : {}),
        },
      });
    } catch (e) {
      track.$.$.auth.signInFail({
        method: "magic-link",
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async signInMagicLink(email: string, token: string, byLink = true) {
    const method = byLink ? "magic-link" : "otp";
    try {
      await this.store.signInMagicLink(email, token);

      await this.primeSessionFromCookie();
      await this.session.waitForRevalidation();
      track.$.$.auth.signedIn({ method });
    } catch (e) {
      track.$.$.auth.signInFail({
        method,
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async signInFirebaseEmailLink(
    email: string | null | undefined,
    link: string,
  ) {
    const method = "magic-link";
    try {
      const auth = await getFirebaseAuth();
      const { isSignInWithEmailLink, signInWithEmailLink } =
        await import("firebase/auth");

      if (!isSignInWithEmailLink(auth, link)) {
        throw new Error("Invalid Firebase email sign-in link.");
      }

      const signInEmail =
        email ?? window.localStorage.getItem(FIREBASE_EMAIL_FOR_SIGN_IN_KEY);
      if (!signInEmail) {
        throw new Error("Email is required to complete Firebase sign-in.");
      }

      const credential = await signInWithEmailLink(auth, signInEmail, link);
      window.localStorage.removeItem(FIREBASE_EMAIL_FOR_SIGN_IN_KEY);
      const token = await credential.user.getIdToken();
      await this.signInFirebaseToken(token);
      track.$.$.auth.signedIn({ method });
    } catch (e) {
      track.$.$.auth.signInFail({
        method,
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async signInFirebaseToken(idToken: string) {
    let res: Response;

    try {
      res = await this.fetchService.fetch("/api/auth/firebase", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });
    } catch (error) {
      if (
        isLocalDevFirebaseBackendUnavailable({
          backendEnabled: BUILD_CONFIG.backendEnabled,
          error,
          hostname: getWindowHostname(),
        })
      ) {
        throw createLocalDevFirebaseBackendUnavailableError();
      }

      throw error;
    }

    const message = await readResponseTextSafe(res);

    if (!res.ok) {
      if (
        isLocalDevFirebaseBackendUnavailable({
          backendEnabled: BUILD_CONFIG.backendEnabled,
          hostname: getWindowHostname(),
          responseText: message,
          status: res.status,
        })
      ) {
        throw createLocalDevFirebaseBackendUnavailableError();
      }

      throw new Error(message || "Failed to sign in with Firebase.");
    }

    await this.primeSessionFromCookie();
    await this.session.waitForRevalidation();
  }

  async ensureFirebaseAuthBackendAvailable() {
    if (!BUILD_CONFIG.backendEnabled) {
      return;
    }

    let res: Response;

    try {
      res = await this.fetchService.fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
    } catch (error) {
      if (
        isLocalDevFirebaseBackendUnavailable({
          backendEnabled: BUILD_CONFIG.backendEnabled,
          error,
          hostname: getWindowHostname(),
        })
      ) {
        throw createLocalDevFirebaseBackendUnavailableError();
      }

      throw error;
    }

    const message = await readResponseTextSafe(res);

    if (
      isLocalDevFirebaseBackendUnavailable({
        backendEnabled: BUILD_CONFIG.backendEnabled,
        hostname: getWindowHostname(),
        responseText: message,
        status: res.status,
      })
    ) {
      throw createLocalDevFirebaseBackendUnavailableError();
    }
  }

  async oauthPreflight(
    provider: OAuthProviderType,
    client: string,
    /** @deprecated*/ redirectUrl?: string,
  ): Promise<Record<string, string>> {
    // OAuth callback requires `client_nonce` for all clients (including web).
    const clientNonce = this.setClientNonce();
    try {
      const res = await this.fetchService.fetch("/api/oauth/preflight", {
        method: "POST",
        body: JSON.stringify({
          provider,
          client,
          redirect_uri: redirectUrl,
          client_nonce: clientNonce,
        }),
        headers: {
          "content-type": "application/json",
        },
      });

      return await res.json();
    } catch (e) {
      track.$.$.auth.signInFail({
        method: "oauth",
        provider,
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async signInOauth(code: string, state: string, provider: string) {
    try {
      const { redirectUri } = await this.store.signInOauth(
        code,
        state,
        provider,
      );

      await this.primeSessionFromCookie();
      await this.session.waitForRevalidation();

      track.$.$.auth.signedIn({ method: "oauth", provider });
      return { redirectUri };
    } catch (e) {
      track.$.$.auth.signInFail({
        method: "oauth",
        provider,
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async createOpenAppSignInCode() {
    const res = await this.fetchService.fetch(
      "/api/auth/open-app/sign-in-code",
      {
        method: "POST",
      },
    );
    const body = (await res.json()) as { code?: string };

    if (!body.code) {
      throw new Error("Missing open-app sign-in code");
    }

    return body.code;
  }

  async signInOpenAppSignInCode(code: string) {
    await this.store.signInOpenAppSignInCode(code);

    await this.primeSessionFromCookie();
    await this.session.waitForRevalidation();
  }

  async signInPassword(credential: {
    email: string;
    password: string;
    verifyToken?: string;
    challenge?: string;
  }) {
    if (isFirebaseAuthConfigured()) {
      return this.signInFirebasePassword(credential.email, credential.password);
    }

    track.$.$.auth.signIn({ method: "password" });
    try {
      const user = await this.store.signInPassword(credential);
      if (user) {
        this.store.setCachedSignInUser(user);
      }
      this.session.revalidate();
      track.$.$.auth.signedIn({ method: "password" });
    } catch (e) {
      track.$.$.auth.signInFail({
        method: "password",
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  async signOut() {
    await this.store.signOut();
    this.store.setCachedAuthSession(null);
    this.session.revalidate();
  }

  async deleteAccount() {
    const res = await this.store.deleteAccount();
    this.store.setCachedAuthSession(null);
    this.session.revalidate();
    this.dialogService.open("deleted-account", {});
    return res;
  }

  checkUserByEmail(email: string) {
    if (isFirebaseAuthConfigured()) {
      return this.checkFirebaseUserByEmail(email);
    }

    if (!BUILD_CONFIG.backendEnabled) {
      return Promise.resolve({
        registered: false,
        methods: {
          password: { available: false },
          magicLink: { available: false },
          oauth: { available: false, providers: [] },
          passkey: { available: false, discoverable: false },
        },
      });
    }

    return this.store.checkUserByEmail(email);
  }

  captchaHeaders(token: string, challenge?: string) {
    const headers: Record<string, string> = {
      "x-captcha-token": token,
    };

    if (challenge) {
      headers["x-captcha-challenge"] = challenge;
    }

    return headers;
  }

  private async sendFirebaseEmailLink(email: string, redirectUrl?: string) {
    const auth = await getFirebaseAuth();
    const { sendSignInLinkToEmail } = await import("firebase/auth");
    const callbackUrl = new URL("/magic-link", window.location.origin);
    const scheme = this.urlService.getClientScheme();

    if (redirectUrl) {
      callbackUrl.searchParams.set("redirect_uri", redirectUrl);
    }
    if (scheme) {
      callbackUrl.searchParams.set("client", scheme);
    }

    await sendSignInLinkToEmail(auth, email, {
      url: callbackUrl.toString(),
      handleCodeInApp: true,
    });
    window.localStorage.setItem(FIREBASE_EMAIL_FOR_SIGN_IN_KEY, email);
  }

  private async signInFirebasePassword(email: string, password: string) {
    track.$.$.auth.signIn({ method: "password" });
    try {
      const auth = await getFirebaseAuth();
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const token = await credential.user.getIdToken();
      await this.signInFirebaseToken(token);
      track.$.$.auth.signedIn({ method: "password" });
    } catch (e) {
      track.$.$.auth.signInFail({
        method: "password",
        reason: UserFriendlyError.fromAny(e).name,
      });
      throw e;
    }
  }

  private async checkFirebaseUserByEmail(email: string) {
    const auth = await getFirebaseAuth();
    const {
      EmailAuthProvider,
      GoogleAuthProvider,
      fetchSignInMethodsForEmail,
    } = await import("firebase/auth");
    const providers = await fetchSignInMethodsForEmail(auth, email);
    const hasPassword = providers.includes(
      EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD,
    );
    const hasEmailLink = providers.includes(
      EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
    );
    const oauthProviders = providers.includes(
      GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD,
    )
      ? [OAuthProviderType.Google]
      : [];

    return {
      registered: providers.length > 0,
      methods: {
        password: {
          available: hasPassword,
        },
        magicLink: {
          available: hasEmailLink || !hasPassword,
        },
        oauth: {
          available: oauthProviders.length > 0,
          providers: oauthProviders,
        },
        passkey: {
          available: false,
          discoverable: false,
        },
      },
    };
  }

  private setClientNonce(): string {
    const nonce = nanoid();
    this.store.setClientNonce(nonce);
    return nonce;
  }

  private ensureFirebaseRedirectSignInProcessed() {
    this.firebaseRedirectSignInPromise ??=
      this.processPendingFirebaseRedirectSignIn().finally(() => {
        this.firebaseRedirectSignInPromise = undefined;
      });

    return this.firebaseRedirectSignInPromise;
  }

  private async processPendingFirebaseRedirectSignIn() {
    if (!isFirebaseAuthConfigured() || !hasPendingFirebaseRedirectSignIn()) {
      return;
    }

    const redirectTarget = getPendingFirebaseRedirectSignInTarget();
    let shouldClearPendingRedirect = false;

    try {
      const user = await this.resolveFirebaseRedirectSignInUser();

      if (!user) {
        return;
      }

      shouldClearPendingRedirect = true;
      const token = await user.getIdToken();
      await this.signInFirebaseToken(token);
      await this.session.waitForRevalidation();
      track.$.$.auth.signedIn({
        method: "oauth",
        provider: OAuthProviderType.Google,
      });

      if (redirectTarget && typeof window !== "undefined") {
        if (redirectTarget.toUpperCase() === "CLOSE_POPUP") {
          window.close();
          return;
        }

        const nextUrl = new URL(redirectTarget, window.location.origin);

        if (nextUrl.toString() !== window.location.href) {
          window.location.replace(nextUrl.toString());
          return;
        }
      }
    } catch (e) {
      shouldClearPendingRedirect = true;
      track.$.$.auth.signInFail({
        method: "oauth",
        provider: OAuthProviderType.Google,
        reason: UserFriendlyError.fromAny(e).name,
      });
      console.error("Failed to complete Firebase redirect sign-in.", e);
    } finally {
      if (shouldClearPendingRedirect) {
        clearPendingFirebaseRedirectSignIn();
      }
    }
  }

  private async primeSessionFromCookie() {
    const res = await this.fetchService.fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) {
      return;
    }

    const session = (await res.json()) as {
      user?: {
        avatarUrl?: string | null;
        email?: string;
        id: string;
        name?: string;
      } | null;
    };

    if (!session.user) {
      return;
    }

    this.store.setCachedAuthSession({
      account: {
        id: session.user.id,
        email: session.user.email,
        label: session.user.name ?? session.user.email ?? session.user.id,
        avatar: session.user.avatarUrl ?? null,
      },
    });
  }

  private async resolveFirebaseRedirectSignInUser() {
    const auth = await getFirebaseAuth();
    const { getRedirectResult, onAuthStateChanged } =
      await import("firebase/auth");
    const timeoutMs = 5000;

    const timeout = <T>(value: T) =>
      new Promise<T>(resolve => {
        window.setTimeout(() => resolve(value), timeoutMs);
      });

    const credential = await Promise.race([
      getRedirectResult(auth).catch(error => {
        console.error("Failed to read Firebase redirect result.", error);
        return null;
      }),
      timeout<null>(null),
    ]);

    if (credential?.user) {
      return credential.user;
    }

    if (auth.currentUser) {
      return auth.currentUser;
    }

    return await Promise.race([
      new Promise<null | NonNullable<typeof auth.currentUser>>(resolve => {
        const unsubscribe = onAuthStateChanged(
          auth,
          user => {
            unsubscribe();
            resolve(user);
          },
          () => {
            unsubscribe();
            resolve(null);
          },
        );
      }),
      timeout<null>(null),
    ]);
  }
}
