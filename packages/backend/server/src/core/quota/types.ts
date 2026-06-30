import { Field, ObjectType, Int } from '@nestjs/graphql';
import { SafeIntResolver } from 'graphql-scalars';

import { UserQuota, WorkspaceQuota } from '../../models';

@ObjectType()
export class UserQuotaHumanReadableType {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  blobLimit!: string;

  @Field(() => String)
  storageQuota!: string;

  @Field(() => String)
  usedStorageQuota!: string;

  @Field(() => String)
  historyPeriod!: string;

  @Field(() => String)
  memberLimit!: string;

  @Field(() => String)
  copilotActionLimit!: string;
}

@ObjectType()
export class UserQuotaType implements UserQuota {
  @Field(() => String)
  name!: string;

  @Field(() => SafeIntResolver)
  blobLimit!: number;

  @Field(() => SafeIntResolver)
  storageQuota!: number;

  @Field(() => SafeIntResolver)
  usedStorageQuota!: number;

  @Field(() => SafeIntResolver)
  historyPeriod!: number;

  @Field(() => Int)
  memberLimit!: number;

  @Field(() => Number, { nullable: true })
  copilotActionLimit?: number;

  @Field(() => UserQuotaHumanReadableType)
  humanReadable!: UserQuotaHumanReadableType;
}

@ObjectType()
export class UserQuotaUsageType {
  @Field(() => SafeIntResolver, {
    name: 'storageQuota',
    deprecationReason: "use `UserQuotaType['usedStorageQuota']` instead",
  })
  storageQuota!: number;
}

@ObjectType()
export class WorkspaceQuotaHumanReadableType {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  blobLimit!: string;

  @Field(() => String)
  storageQuota!: string;

  @Field(() => String)
  storageQuotaUsed!: string;

  @Field(() => String)
  historyPeriod!: string;

  @Field(() => String)
  memberLimit!: string;

  @Field(() => String)
  memberCount!: string;

  @Field(() => String)
  overcapacityMemberCount!: string;
}

@ObjectType()
export class WorkspaceQuotaType implements Partial<WorkspaceQuota> {
  @Field(() => String)
  name!: string;

  @Field(() => SafeIntResolver)
  blobLimit!: number;

  @Field(() => SafeIntResolver)
  storageQuota!: number;

  @Field(() => SafeIntResolver)
  usedStorageQuota!: number;

  @Field(() => SafeIntResolver)
  historyPeriod!: number;

  @Field(() => Int)
  memberLimit!: number;

  @Field(() => Int)
  memberCount!: number;

  @Field(() => Int)
  overcapacityMemberCount!: number;

  @Field(() => WorkspaceQuotaHumanReadableType)
  humanReadable!: WorkspaceQuotaHumanReadableType;
}
