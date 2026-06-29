import {
  createUnionType,
  Field,
  ID,
  InputType,
  ObjectType,
} from '@nestjs/graphql';
import type { User } from '@prisma/client';

import {
  PublicUser,
  UserSettings,
  UserSettingsInput,
  WorkspaceUser,
} from '../../models';
import { type CurrentUser } from '../auth/session';

@ObjectType()
export class UserType implements CurrentUser {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'User name' })
  name!: string;

  @Field(() => String, { description: 'User email' })
  email!: string;

  @Field(() => Boolean, { description: 'User email verified' })
  emailVerified!: boolean;

  @Field(() => Boolean, {
    description: 'User has password',
    nullable: true,
  })
  hasPassword!: boolean | null;

  @Field(() => String, { description: 'User avatar url', nullable: true })
  avatarUrl!: string | null;

  @Field(() => Date, {
    deprecationReason: 'useless',
    description: 'User email verified',
    nullable: true,
  })
  createdAt?: Date | null;

  @Field(() => Boolean, {
    description: 'User is disabled',
  })
  disabled!: boolean;
}

@ObjectType()
export class PublicUserType implements PublicUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;
}

@ObjectType()
export class WorkspaceUserType implements WorkspaceUser {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  email!: string;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;
}

@ObjectType()
export class LimitedUserType implements Partial<User> {
  @Field(() => String, { description: 'User email' })
  email!: string;

  @Field(() => Boolean, {
    description: 'User has password',
    nullable: true,
  })
  hasPassword?: boolean | null;
}

export const UserOrLimitedUser = createUnionType({
  name: 'UserOrLimitedUser',
  types: () => [UserType, LimitedUserType] as const,
  resolveType(value) {
    if (value.id) {
      return UserType;
    }
    return LimitedUserType;
  },
});

@ObjectType()
export class DeleteAccount {
  @Field(() => Boolean)
  success!: boolean;
}
@ObjectType()
export class RemoveAvatar {
  @Field(() => Boolean)
  success!: boolean;
}

@ObjectType()
export class UserSettingsType implements UserSettings {
  @Field(() => Boolean, { description: 'Receive invitation email' })
  receiveInvitationEmail!: boolean;

  @Field(() => Boolean, { description: 'Receive mention email' })
  receiveMentionEmail!: boolean;

  @Field(() => Boolean, { description: 'Receive comment email' })
  receiveCommentEmail!: boolean;
}

@InputType()
export class UpdateUserInput implements Partial<User> {
  @Field(() => String, { description: 'User name', nullable: true })
  name?: string;
}

@InputType()
export class ManageUserInput {
  @Field(() => String, { description: 'User email', nullable: true })
  email?: string;

  @Field(() => String, { description: 'User name', nullable: true })
  name?: string;
}

@InputType()
export class UpdateUserSettingsInput implements UserSettingsInput {
  @Field(() => Boolean, { description: 'Receive invitation email', nullable: true })
  receiveInvitationEmail?: boolean;

  @Field(() => Boolean, { description: 'Receive mention email', nullable: true })
  receiveMentionEmail?: boolean;

  @Field(() => Boolean, { description: 'Receive comment email', nullable: true })
  receiveCommentEmail?: boolean;
}
