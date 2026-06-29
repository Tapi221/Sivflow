import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { OnEvent } from '../../base';
import { Models } from '../../models';
import { PgWorkspaceDocStorageAdapter } from './adapters/workspace';
import { DocReader } from './reader';

const IGNORED_PRISMA_CODES = new Set(['P2003', 'P2025', 'P2028']);
const USER_WORKSPACE_DELETE_CONCURRENCY = 8;

function isIgnorableDocEventError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return IGNORED_PRISMA_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /transaction is aborted|transaction already closed/i.test(
      error.message
    );
  }
  return false;
}

@Injectable()
export class DocEventsListener {
  private readonly logger = new Logger(DocEventsListener.name);

  constructor(
    @Inject(DocReader) private readonly docReader: DocReader,
    @Inject(Models) private readonly models: Models,
    @Inject(PgWorkspaceDocStorageAdapter) private readonly workspace: PgWorkspaceDocStorageAdapter
  ) {}

  @OnEvent('doc.snapshot.updated')
  async markDocContentCacheStale({
    workspaceId,
    docId,
    blob,
  }: Events['doc.snapshot.updated']) {
    await this.docReader.markDocContentCacheStale(workspaceId, docId);
    const workspace = await this.models.workspace.get(workspaceId);
    if (!workspace) {
      this.logger.warn(
        `Skip stale doc snapshot event for missing workspace ${workspaceId}/${docId}`
      );
      return;
    }
    const isDoc = workspaceId !== docId;
    // update doc content to database
    try {
      if (isDoc) {
        const content = this.docReader.parseDocContent(blob);
        if (!content) {
          return;
        }
        await this.models.doc.upsertMeta(workspaceId, docId, content);
      } else {
        // update workspace content to database
        const content = this.docReader.parseWorkspaceContent(blob);
        if (!content) {
          return;
        }
        await this.models.workspace.update(workspaceId, content);
      }
    } catch (error) {
      if (isIgnorableDocEventError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Ignore stale doc snapshot event for ${workspaceId}/${docId}: ${message}`
        );
        return;
      }
      throw error;
    }
  }

  @OnEvent('user.deleted')
  async clearUserWorkspaces(payload: Events['user.deleted']) {
    const ownedWorkspaces = Array.from(
      new Set(
        Array.isArray(payload.ownedWorkspaces) ? payload.ownedWorkspaces : []
      )
    );

    if (!ownedWorkspaces.length) {
      this.logger.debug(
        `Skip workspace cleanup for deleted user ${payload.id}: no owned workspaces`
      );
      return;
    }

    for (
      let offset = 0;
      offset < ownedWorkspaces.length;
      offset += USER_WORKSPACE_DELETE_CONCURRENCY
    ) {
      const batch = ownedWorkspaces.slice(
        offset,
        offset + USER_WORKSPACE_DELETE_CONCURRENCY
      );

      await Promise.all(
        batch.map(async workspace => {
          await this.models.workspace.delete(workspace);
          await this.workspace.deleteSpace(workspace);
        })
      );
    }
  }
}
