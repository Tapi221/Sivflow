import { ModuleRef } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

import { WorkspacePolicyService } from '../../core/permission/policy';
import { Models } from '../../models';

function shouldRunLegacySqlBackfill() {
  return process.env.DATABASE_URL?.startsWith('postgres') === true;
}

export class BackfillPermissionProjection1765500000000 {
  static async up(db: PrismaClient, ref: ModuleRef) {
    const models = ref.get(Models, { strict: false });

    if (shouldRunLegacySqlBackfill()) {
      await models.permissionProjection.backfillLegacyProjection();
      await ensureWorkspaceAdminStatsDirtyTriggerGuard(db);
      await repairOwnerlessWorkspaces(db);
    }

    const policy = ref.get(WorkspacePolicyService, { strict: false });
    const workspaces = await db.workspace.findMany({
      select: { id: true },
    });
    for (const workspace of workspaces) {
      const state = await policy.getWorkspaceState(workspace.id);
      await models.workspaceRuntimeState.upsert(workspace.id, {
        readonly: state.isReadonly,
        readonlyReasons: state.readonlyReasons,
        known: true,
        staleAfter: null,
      });
    }
  }

  static async down(_db: PrismaClient) {}
}

async function ensureWorkspaceAdminStatsDirtyTriggerGuard(_db: PrismaClient) {
  // PostgreSQL used a plpgsql trigger guard here. Turso/libSQL does not support
  // plpgsql, and the generated Turso schema does not create that trigger, so the
  // migration step is intentionally a no-op.
}

async function repairOwnerlessWorkspaces(db: PrismaClient) {
  const workspaces = await db.workspace.findMany({
    select: { id: true },
  });

  for (const workspace of workspaces) {
    const owner = await db.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        role: 'owner',
        state: 'active',
      },
      select: { id: true },
    });

    if (owner) {
      continue;
    }

    const firstActiveMember = await db.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        state: 'active',
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (firstActiveMember) {
      await db.workspaceMember.update({
        where: { id: firstActiveMember.id },
        data: { role: 'owner' },
      });
      continue;
    }

    await db.workspace.delete({
      where: { id: workspace.id },
    });
  }
}
