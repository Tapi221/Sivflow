import { Inject, Injectable } from '@nestjs/common';

import { ActionForbidden, InvalidAuthState } from '../../base';
import { Models } from '../../models';
import { validators } from '../utils/validators';
import { verifyEmailDomainRecords } from './email-domain';
import type { VerifiedIdentity } from './identity';

type FirebaseLookupUser = {
  localId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  emailVerified?: boolean;
};

type FirebaseLookupResponse = {
  users?: FirebaseLookupUser[];
};

@Injectable()
export class FirebaseAuthService {
  constructor(@Inject(Models) private readonly models: Models) {}

  async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
    const token = idToken?.trim();
    if (!token) {
      throw new InvalidAuthState('Firebase ID token is required.');
    }

    const apiKey = this.getFirebaseApiKey();
    const firebaseUser = await this.lookupUser(token, apiKey);
    if (!firebaseUser.email) {
      throw new InvalidAuthState('Firebase account email is required.');
    }
    validators.assertValidEmail(firebaseUser.email);

    if (firebaseUser.emailVerified !== true) {
      throw new ActionForbidden();
    }

    const user = await this.getOrCreateUser(
      firebaseUser.email,
      firebaseUser.displayName,
      firebaseUser.photoUrl
    );

    return {
      userId: user.id,
      method: 'oauth',
    };
  }

  private getFirebaseApiKey() {
    const apiKey =
      process.env.AFFINE_FIREBASE_API_KEY?.trim() ||
      process.env.FIREBASE_API_KEY?.trim() ||
      process.env.VITE_FIREBASE_API_KEY?.trim();

    if (!apiKey) {
      throw new InvalidAuthState('Firebase Auth api key is not configured.');
    }

    return apiKey;
  }

  private async lookupUser(idToken: string, apiKey: string) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      throw new InvalidAuthState('Invalid Firebase ID token.');
    }

    const body = (await res.json()) as FirebaseLookupResponse;
    const user = body.users?.[0];
    if (!user?.localId) {
      throw new InvalidAuthState('Invalid Firebase ID token.');
    }

    return user;
  }

  private async getOrCreateUser(
    email: string,
    name?: string,
    avatarUrl?: string
  ) {
    const existingUser = await this.models.user.getUserByEmail(email, {
      withDisabled: true,
    });

    if (!existingUser) {
      if (process.env.AFFINE_AUTH_ALLOW_SIGNUP_FOR_OAUTH === 'false') {
        throw new ActionForbidden();
      }
      if (
        process.env.AFFINE_AUTH_REQUIRE_EMAIL_DOMAIN_VERIFICATION === 'true' &&
        !(await verifyEmailDomainRecords(email))
      ) {
        throw new ActionForbidden();
      }
      return await this.models.user.create({
        email,
        name,
        avatarUrl,
      });
    }

    if (existingUser.disabled) {
      throw new ActionForbidden();
    }

    return existingUser;
  }
}
