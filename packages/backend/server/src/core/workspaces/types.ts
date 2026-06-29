import {
  Field,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { WorkspaceMemberStatus } from '@prisma/client';
import { GraphQLJSONObject, SafeIntResolver } from 'graphql-scalars';

import { DocRole, WorkspaceRole } from '../permission';
import { WorkspaceUserType } from '../user/types';

registerEnumType(WorkspaceRole, {
  name: 'WorkspaceRole',
  description: 'User role in workspace',
});

// @deprecated
registerEnumType(WorkspaceRole, {
  name: 'Permission',
  description: 'User permission in workspace',
});

registerEnumType(DocRole, {
  name: 'DocRole',
  description: 'User permission in doc',
});

registerEnumType(WorkspaceMemberStatus, {
  name: 'WorkspaceMemberStatus',
  description: 'Member invite status in workspace',
});

@ObjectType()
export class InviteUserType {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'User name', nullable: true })
  name?: string | null;

  @Field(() => String, { description: 'User email', nullable: true })
  email?: string | null;

  @Field(() => Boolean, {
    description: 'User email verified',
    nullable: true,
  })
  emailVerified?: boolean | null;

  @Field(() => Boolean, {
    description: 'User has password',
    nullable: true,
  })
  hasPassword?: boolean | null;

  @Field(() => String, {
    description: 'User avatar url',
    nullable: true,
  })
  avatarUrl?: string | null;

  @Field(() => Date, {
    deprecationReason: 'useless',
    description: 'User email verified',
    nullable: true,
  })
  createdAt?: Date | null;

  @Field(() => Boolean, {
    description: 'User is disabled',
    nullable: true,
  })
  disabled?: boolean | null;

  @Field(() => WorkspaceRole, {
    deprecationReason: 'Use role instead',
    description: 'User permission in workspace',
  })
  permission!: WorkspaceRole;

  @Field(() => WorkspaceRole, { description: 'User role in workspace' })
  role!: WorkspaceRole;

  @Field(() => String, { description: 'Invite id' })
  inviteId!: string;

  @Field(() => WorkspaceMemberStatus, {
    description: 'Member invite status in workspace',
  })
  status!: WorkspaceMemberStatus;
}

@ObjectType()
export class WorkspaceFeatureType {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean, { description: 'is Public workspace' })
  public!: boolean;

  @Field(() => Date, { description: 'Workspace created date' })
  createdAt!: Date;
}

@ObjectType()
export class WorkspaceType extends WorkspaceFeatureType {
  @Field(() => Boolean, { description: 'Enable AI' })
  enableAi!: boolean;

  @Field(() => Boolean, { description: 'Enable workspace sharing' })
  enableSharing!: boolean;

  @Field(() => Boolean, { description: 'Enable url previous when sharing' })
  enableUrlPreview!: boolean;

  @Field(() => Boolean, { description: 'Enable doc embedding' })
  enableDocEmbedding!: boolean;

  @Field(() => [InviteUserType], {
    description: 'Members of workspace',
  })
  members!: InviteUserType[];
}

@ObjectType()
export class InvitationWorkspaceType {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: 'Workspace name' })
  name!: string;

  @Field(() => String, {
    // nullable: true,
    description: 'Base64 encoded avatar',
  })
  avatar!: string;
}

@ObjectType()
export class WorkspaceBlobSizes {
  @Field(() => SafeIntResolver)
  size!: number;
}

@ObjectType()
export class InvitationType {
  @Field(() => InvitationWorkspaceType, {
    description: 'Workspace information',
  })
  workspace!: InvitationWorkspaceType;
  @Field(() => WorkspaceUserType, { description: 'User information' })
  user!: WorkspaceUserType;
  @Field(() => WorkspaceUserType, { description: 'Invitee information' })
  invitee!: WorkspaceUserType;
  @Field(() => WorkspaceMemberStatus, {
    description: 'Invitation status in workspace',
    nullable: true,
  })
  status?: WorkspaceMemberStatus;
}

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean, {
    description: 'is Public workspace',
    nullable: true,
  })
  public?: boolean;

  @Field(() => Boolean, { description: 'Enable AI', nullable: true })
  enableAi?: boolean;

  @Field(() => Boolean, {
    description: 'Enable workspace sharing',
    nullable: true,
  })
  enableSharing?: boolean;

  @Field(() => Boolean, {
    description: 'Enable url previous when sharing',
    nullable: true,
  })
  enableUrlPreview?: boolean;

  @Field(() => Boolean, {
    description: 'Enable doc embedding',
    nullable: true,
  })
  enableDocEmbedding?: boolean;
}

@ObjectType()
export class InviteLink {
  @Field(() => String, { description: 'Invite link' })
  link!: string;

  @Field(() => Date, { description: 'Invite link expire time' })
  expireTime!: Date;
}

@ObjectType()
export class InviteResult {
  @Field(() => String)
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Invite id, null if invite record create failed',
  })
  inviteId?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'Invite error',
  })
  error?: object;
}

const Day = 24 * 60 * 60 * 1000;

export enum WorkspaceInviteLinkExpireTime {
  OneDay = Day,
  ThreeDays = 3 * Day,
  OneWeek = 7 * Day,
  OneMonth = 30 * Day,
}

registerEnumType(WorkspaceInviteLinkExpireTime, {
  name: 'WorkspaceInviteLinkExpireTime',
  description: 'Workspace invite link expire time',
});
