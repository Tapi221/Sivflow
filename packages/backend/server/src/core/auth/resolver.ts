import { Inject } from '@nestjs/common';
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import {
  ActionForbidden,
  EmailAlreadyUsed,
  EmailTokenNotFound,
  EmailVerificationRequired,
  InvalidEmailToken,
  LinkExpired,
  SameEmailProvided,
  SkipThrottle,
  Throttle,
  URLHelper,
} from '../../base';
import { Models, TokenType } from '../../models';
import { Admin } from '../common';
import { UserType } from '../user/types';
import { validators } from '../utils/validators';
import { Public } from './guard';
import { AuthService } from './service';
import { CurrentUser } from './session';

@ObjectType('tokenType')
export class ClientTokenType {
  @Field(() => String)
  token!: string;

  @Field(() => String)
  refresh!: string;

  @Field(() => String, { nullable: true })
  sessionToken?: string;
}

@Throttle('strict')
@Resolver(() => UserType)
export class AuthResolver {
  constructor(
    @Inject(URLHelper)
    private readonly url: URLHelper,
    @Inject(AuthService)
    private readonly auth: AuthService,
    @Inject(Models) private readonly models: Models
  ) {}

  @SkipThrottle()
  @Public()
  @Query(() => UserType, {
    name: 'currentUser',
    description: 'Get current user',
    nullable: true,
  })
  currentUser(@CurrentUser() user?: CurrentUser): UserType | undefined {
    return user;
  }

  @ResolveField(() => ClientTokenType, {
    name: 'token',
    deprecationReason: 'use native session exchange instead',
  })
  async clientToken(
    @CurrentUser() currentUser: CurrentUser,
    @Parent() user: UserType
  ): Promise<ClientTokenType> {
    if (user.id !== currentUser.id) {
      throw new ActionForbidden();
    }

    const userSession = await this.auth.createUserSession(user.id);

    return {
      sessionToken: userSession.sessionId,
      token: userSession.sessionId,
      refresh: '',
    };
  }

  @Public()
  @Mutation(() => Boolean)
  async changePassword(
    @Args('token', { type: () => String }) token: string,
    @Args('newPassword', { type: () => String }) newPassword: string,
    @Args('userId', { type: () => String, nullable: true }) userId?: string
  ) {
    if (!userId) {
      throw new LinkExpired();
    }

    // NOTE: Set & Change password are using the same token type.
    const valid = await this.models.verificationToken.verify(
      TokenType.ChangePassword,
      token,
      {
        credential: userId,
      }
    );

    if (!valid) {
      throw new InvalidEmailToken();
    }

    await this.auth.changePassword(userId, newPassword);
    await this.auth.revokeUserSessions(userId);

    return true;
  }

  @Mutation(() => UserType)
  async changeEmail(
    @CurrentUser() user: CurrentUser,
    @Args('token', { type: () => String }) token: string,
    @Args('email', { type: () => String }) email: string
  ) {
    // @see [sendChangeEmail]
    const valid = await this.models.verificationToken.verify(
      TokenType.VerifyEmail,
      token,
      {
        credential: user.id,
      }
    );

    if (!valid) {
      throw new InvalidEmailToken();
    }

    email = decodeURIComponent(email);

    await this.auth.changeEmail(user.id, email);
    await this.auth.revokeUserSessions(user.id);
    await this.auth.sendNotificationChangeEmail(email);

    return user;
  }

  @Mutation(() => Boolean)
  async sendChangePasswordEmail(
    @CurrentUser() user: CurrentUser,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string,
    @Args('email', {
      type: () => String,
      nullable: true,
      deprecationReason: 'fetched from signed in user',
    })
    _email?: string
  ) {
    if (!user.emailVerified) {
      throw new EmailVerificationRequired();
    }

    const token = await this.models.verificationToken.create(
      TokenType.ChangePassword,
      user.id
    );

    const url = this.url.safeLink(callbackUrl, { userId: user.id, token });

    return await this.auth.sendChangePasswordEmail(user.email, url);
  }

  @Mutation(() => Boolean)
  async sendSetPasswordEmail(
    @CurrentUser() user: CurrentUser,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string,
    @Args('email', {
      type: () => String,
      nullable: true,
      deprecationReason: 'fetched from signed in user',
    })
    _email?: string
  ) {
    return this.sendChangePasswordEmail(user, callbackUrl);
  }

  // The change email step is:
  // 1. send email to primitive email `sendChangeEmail`
  // 2. user open change email page from email
  // 3. send verify email to new email `sendVerifyChangeEmail`
  // 4. user open confirm email page from new email
  // 5. user click confirm button
  // 6. send notification email
  @Mutation(() => Boolean)
  async sendChangeEmail(
    @CurrentUser() user: CurrentUser,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string
  ) {
    if (!user.emailVerified) {
      throw new EmailVerificationRequired();
    }

    const token = await this.models.verificationToken.create(
      TokenType.ChangeEmail,
      user.id
    );

    const url = this.url.safeLink(callbackUrl, { token });

    return await this.auth.sendChangeEmail(user.email, url);
  }

  @Mutation(() => Boolean)
  async sendVerifyChangeEmail(
    @CurrentUser() user: CurrentUser,
    @Args('token', { type: () => String }) token: string,
    @Args('email', { type: () => String }) email: string,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string
  ) {
    if (!token) {
      throw new EmailTokenNotFound();
    }

    validators.assertValidEmail(email);
    const valid = await this.models.verificationToken.verify(
      TokenType.ChangeEmail,
      token,
      {
        credential: user.id,
      }
    );

    if (!valid) {
      throw new InvalidEmailToken();
    }

    const hasRegistered = await this.models.user.getUserByEmail(email);

    if (hasRegistered) {
      if (hasRegistered.id !== user.id) {
        throw new EmailAlreadyUsed();
      } else {
        throw new SameEmailProvided();
      }
    }

    const verifyEmailToken = await this.models.verificationToken.create(
      TokenType.VerifyEmail,
      user.id
    );

    const url = this.url.safeLink(callbackUrl, {
      token: verifyEmailToken,
      email,
    });
    return await this.auth.sendVerifyChangeEmail(email, url);
  }

  @Mutation(() => Boolean)
  async sendVerifyEmail(
    @CurrentUser() user: CurrentUser,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string
  ) {
    const token = await this.models.verificationToken.create(
      TokenType.VerifyEmail,
      user.id
    );

    const url = this.url.safeLink(callbackUrl, { token });

    return await this.auth.sendVerifyEmail(user.email, url);
  }

  @Mutation(() => Boolean)
  async verifyEmail(
    @CurrentUser() user: CurrentUser,
    @Args('token', { type: () => String }) token: string
  ) {
    if (!token) {
      throw new EmailTokenNotFound();
    }

    const valid = await this.models.verificationToken.verify(
      TokenType.VerifyEmail,
      token,
      {
        credential: user.id,
      }
    );

    if (!valid) {
      throw new InvalidEmailToken();
    }

    await this.auth.setEmailVerified(user.id);

    return true;
  }

  @Admin()
  @Mutation(() => String, {
    description: 'Create change password url',
  })
  async createChangePasswordUrl(
    @Args('userId', { type: () => String }) userId: string,
    @Args('callbackUrl', { type: () => String }) callbackUrl: string
  ): Promise<string> {
    const token = await this.models.verificationToken.create(
      TokenType.ChangePassword,
      userId
    );

    return this.url.safeLink(callbackUrl, { userId, token });
  }
}
