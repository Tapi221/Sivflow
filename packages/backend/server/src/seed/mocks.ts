import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { faker } from '@faker-js/faker';
import type { Type } from '@nestjs/common';
import type {
  AccessToken,
  Prisma,
  PrismaClient,
  Snapshot,
  User,
  UserSettings,
  Workspace,
  WorkspaceDoc,
  WorkspaceDocUserRole,
  WorkspaceUserRole,
} from '@prisma/client';
import { omit } from 'lodash-es';

import {
  Feature,
  FeatureConfigs,
  FeatureType,
  type UserFeatureName,
  type UserSettingsInput,
  WorkspaceMemberStatus,
  WorkspaceRole,
} from '../models';

abstract class SeedMocker<In, Out> {
  protected db!: PrismaClient;

  abstract create(input?: Partial<In>): Promise<Out>;
}

type SeedMockerConstructor<In, Out> = Type<SeedMocker<In, Out>>;
export type SeedMockerInput<Ctor extends SeedMockerConstructor<any, any>> =
  Ctor extends SeedMockerConstructor<infer In, any> ? In : never;
type SeedMockerOutput<Ctor extends SeedMockerConstructor<any, any>> =
  Ctor extends SeedMockerConstructor<any, infer Out> ? Out : never;

const FACTORIES = new Map<string, SeedMocker<any, any>>();

interface FactoryOptions {
  logger: ((val: unknown) => void) | boolean;
}

export const createSeedFactory = (
  db: PrismaClient,
  opts: FactoryOptions = { logger: false }
) => {
  const log = (val: unknown) => {
    if (typeof opts.logger === 'function') {
      opts.logger(val);
    } else if (opts.logger) {
      console.log(val);
    }
  };

  class Inner {
    static create<Ctor extends SeedMockerConstructor<any, any>>(
      Factory: Ctor,
      overrides?: Partial<SeedMockerInput<Ctor>>
    ): Promise<SeedMockerOutput<Ctor>>;
    static create<Ctor extends SeedMockerConstructor<any, any>>(
      Factory: Ctor,
      count: number
    ): Promise<SeedMockerOutput<Ctor>[]>;
    static create<Ctor extends SeedMockerConstructor<any, any>>(
      Factory: Ctor,
      overrides: Partial<SeedMockerInput<Ctor>>,
      count: number
    ): Promise<SeedMockerOutput<Ctor>[]>;
    static async create<Ctor extends SeedMockerConstructor<any, any>>(
      Factory: Ctor,
      overridesOrCount?: Partial<SeedMockerInput<Ctor>> | number,
      count?: number
    ): Promise<SeedMockerOutput<Ctor> | SeedMockerOutput<Ctor>[]> {
      let factory = FACTORIES.get(Factory.name);

      if (!factory) {
        factory = new Factory();
        // @ts-expect-error private
        factory.db = db;
        FACTORIES.set(Factory.name, factory);
      }

      let overrides: Partial<SeedMockerInput<Ctor>> | undefined = undefined;
      if (typeof overridesOrCount === 'number') {
        count = overridesOrCount;
      } else {
        overrides = overridesOrCount;
      }

      if (typeof count === 'number') {
        return await Promise.all(
          Array.from({ length: count }).map(async () => {
            const row = await factory.create(overrides);
            log(row);
            return row;
          })
        );
      }

      const row = await factory.create(overrides);
      log(row);
      return row;
    }
  }

  return Inner.create;
};

export type MockUserInput = Prisma.UserCreateInput & {
  feature?: UserFeatureName;
};

class MockUser extends SeedMocker<MockUserInput, User> {
  override async create(input?: Partial<MockUserInput>) {
    const { feature, ...userInput } = input ?? {};
    const user = await this.db.user.create({
      data: {
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        ...userInput,
      },
    });

    if (feature) {
      const config = FeatureConfigs[feature];
      await this.db.userFeature.create({
        data: {
          userId: user.id,
          name: feature,
          type: config.type,
          reason: 'seed',
          activated: true,
        },
      });
    }

    return user;
  }
}

export type MockWorkspaceInput = Prisma.WorkspaceCreateInput & {
  owner?: { id: string };
  snapshot?: Uint8Array | true;
};

class MockWorkspace extends SeedMocker<MockWorkspaceInput, Workspace> {
  override async create(input?: Partial<MockWorkspaceInput>) {
    const owner = input?.owner;
    if (input?.snapshot === true) {
      input.snapshot = await readFile(
        path.join(
          import.meta.dirname,
          '../../../../../tests/backend/server/src/__tests__/__fixtures__/test-root-doc.snapshot.bin'
        )
      );
    }

    const snapshot = input?.snapshot;
    input = omit(input, 'owner', 'snapshot');
    const workspace = await this.db.workspace.create({
      data: {
        name: faker.animal.cat(),
        public: false,
        ...input,
        permissions: owner
          ? {
              create: {
                userId: owner.id,
                type: WorkspaceRole.Owner,
                status: 'Accepted',
              },
            }
          : undefined,
      },
    });

    const runtimeStateColumns = await this.db.$queryRaw<
      Array<{ exists: boolean }>
    >`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'workspace_runtime_states'
          AND column_name = 'known'
      ) AS "exists"
    `;

    if (runtimeStateColumns[0]?.exists) {
      await this.db.$executeRaw`
        INSERT INTO workspace_runtime_states (
          workspace_id,
          known,
          readonly,
          readonly_reasons,
          last_reconciled_at,
          stale_after,
          updated_at
        )
        VALUES (${workspace.id}, true, false, ARRAY[]::TEXT[], now(), NULL, now())
        ON CONFLICT (workspace_id)
        DO UPDATE SET
          known = true,
          readonly = false,
          readonly_reasons = ARRAY[]::TEXT[],
          last_reconciled_at = now(),
          stale_after = NULL,
          updated_at = now()
      `;
    } else {
      await this.db.$executeRaw`
        INSERT INTO workspace_runtime_states (
          workspace_id,
          readonly,
          readonly_reasons,
          stale_at,
          updated_at
        )
        VALUES (${workspace.id}, false, ARRAY[]::TEXT[], NULL, now())
        ON CONFLICT (workspace_id)
        DO UPDATE SET
          readonly = false,
          readonly_reasons = ARRAY[]::TEXT[],
          stale_at = NULL,
          updated_at = now()
      `;
    }

    if (snapshot) {
      await this.db.snapshot.create({
        data: {
          id: workspace.id,
          workspaceId: workspace.id,
          blob: snapshot,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: owner?.id,
          updatedBy: owner?.id,
        },
      });
    }

    return workspace;
  }
}

interface MockTeamWorkspaceInput {
  id: string;
  quantity: number;
}

class MockTeamWorkspace extends SeedMocker<
  MockTeamWorkspaceInput,
  { id: string }
> {
  override async create(input?: Partial<MockTeamWorkspaceInput>) {
    const id = input?.id ?? faker.string.uuid();
    const quantity = input?.quantity ?? 10;

    await this.db.subscription.create({
      data: {
        targetId: id,
        plan: 'team',
        recurring: 'monthly',
        status: 'active',
        start: faker.date.past(),
        nextBillAt: faker.date.future(),
        quantity,
      },
    });
    await this.db.entitlement.create({
      data: {
        targetType: 'workspace',
        targetId: id,
        source: 'cloud_subscription',
        plan: 'team',
        status: 'active',
        quantity,
      },
    });
    await this.db.workspaceFeature.create({
      data: {
        workspaceId: id,
        reason: 'seed',
        activated: true,
        name: Feature.TeamPlan,
        type: FeatureType.Quota,
        configs: {
          memberLimit: quantity,
        },
      },
    });

    return { id };
  }
}

export type MockWorkspaceUserInput = Omit<
  Prisma.WorkspaceUserRoleUncheckedCreateInput,
  'type'
> & {
  type?: WorkspaceRole;
};

class MockWorkspaceUser extends SeedMocker<
  MockWorkspaceUserInput,
  WorkspaceUserRole
> {
  override async create(input: MockWorkspaceUserInput) {
    return await this.db.workspaceUserRole.create({
      data: {
        type: WorkspaceRole.Collaborator,
        status: WorkspaceMemberStatus.Accepted,
        ...input,
      },
    });
  }
}

export type MockUserSettingsInput = UserSettingsInput & {
  userId: string;
};

class MockUserSettings extends SeedMocker<MockUserSettingsInput, UserSettings> {
  override async create(input: MockUserSettingsInput) {
    return await this.db.userSettings.create({
      data: {
        userId: input.userId,
        payload: {
          ...omit(input, 'userId'),
        },
      },
    });
  }
}

export type MockDocMetaInput = Prisma.WorkspaceDocUncheckedCreateInput;

class MockDocMeta extends SeedMocker<MockDocMetaInput, WorkspaceDoc> {
  override async create(input: MockDocMetaInput) {
    return await this.db.workspaceDoc.create({
      data: input,
    });
  }
}

export type MockDocSnapshotInput = {
  user: { id: string };
  workspaceId: string;
  docId?: string;
  blob?: Uint8Array;
  updatedAt?: Date;
  snapshotFile?: string;
};

class MockDocSnapshot extends SeedMocker<MockDocSnapshotInput, Snapshot> {
  override async create(input: MockDocSnapshotInput) {
    if (!input.blob) {
      input.blob = await readFile(
        path.join(
          import.meta.dirname,
          `../../../../../tests/backend/server/src/__tests__/__fixtures__/${
            input.snapshotFile ?? 'test-doc.snapshot.bin'
          }`
        )
      );
    }

    return await this.db.snapshot.create({
      data: {
        id: input.docId ?? faker.string.nanoid(),
        workspaceId: input.workspaceId,
        blob: input.blob,
        createdAt: new Date(),
        updatedAt: input.updatedAt ?? new Date(),
        createdBy: input.user.id,
        updatedBy: input.user.id,
      },
    });
  }
}

export type MockDocUserInput = Prisma.WorkspaceDocUserRoleUncheckedCreateInput;

class MockDocUser extends SeedMocker<MockDocUserInput, WorkspaceDocUserRole> {
  override async create(input: MockDocUserInput) {
    return await this.db.workspaceDocUserRole.create({
      data: input,
    });
  }
}

export type MockAccessTokenInput = Omit<
  Prisma.AccessTokenUncheckedCreateInput,
  'token'
>;

class MockAccessToken extends SeedMocker<MockAccessTokenInput, AccessToken> {
  override async create(input: MockAccessTokenInput) {
    return await this.db.accessToken.create({
      data: {
        ...input,
        name: input.name ?? faker.lorem.word(),
        token: 'ut_' + faker.string.hexadecimal({ length: 37 }),
      },
    });
  }
}

export const Mockers = {
  User: MockUser,
  Workspace: MockWorkspace,
  TeamWorkspace: MockTeamWorkspace,
  WorkspaceUser: MockWorkspaceUser,
  UserSettings: MockUserSettings,
  DocMeta: MockDocMeta,
  DocSnapshot: MockDocSnapshot,
  DocUser: MockDocUser,
  AccessToken: MockAccessToken,
};
