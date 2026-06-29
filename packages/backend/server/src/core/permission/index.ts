import './config';

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

import { Config } from '../../base';
import { Models } from '../../models';
import { QuotaServiceModule } from '../quota/service.module';
import { AccessControllerBuilder } from './builder';
import { PermissionContextLoader } from './context-loader';
import { PermissionDiagnosticService } from './diagnostic';
import { EventsListener } from './event';
import { WorkspacePolicyService } from './policy';
import { PermissionProjectionChecker } from './projection-checker';
import { PermissionService } from './service';
import { PermissionSqlPredicateBuilder } from './sql-predicate';

const permissionContextLoaderProvider = {
  provide: PermissionContextLoader,
  useFactory: (
    models: Models,
    db: PrismaClient,
    cls?: ClsService
  ) => new PermissionContextLoader(models, db, cls),
  inject: [Models, PrismaClient, { token: ClsService, optional: true }],
};

const permissionServiceProvider = {
  provide: PermissionService,
  useFactory: (
    loader: PermissionContextLoader,
    sqlPredicate: PermissionSqlPredicateBuilder,
    workspacePolicy?: WorkspacePolicyService,
    config?: Config
  ) =>
    new PermissionService(loader, sqlPredicate, workspacePolicy, config),
  inject: [
    PermissionContextLoader,
    PermissionSqlPredicateBuilder,
    { token: WorkspacePolicyService, optional: true },
    { token: Config, optional: true },
  ],
};

const permissionDiagnosticServiceProvider = {
  provide: PermissionDiagnosticService,
  useFactory: (
    loader: PermissionContextLoader,
    permission: PermissionService,
    sqlPredicate?: PermissionSqlPredicateBuilder
  ) => new PermissionDiagnosticService(loader, permission, sqlPredicate),
  inject: [
    PermissionContextLoader,
    PermissionService,
    { token: PermissionSqlPredicateBuilder, optional: true },
  ],
};

@Module({
  imports: [QuotaServiceModule],
  providers: [
    AccessControllerBuilder,
    EventsListener,
    WorkspacePolicyService,
    PermissionProjectionChecker,
    PermissionSqlPredicateBuilder,
    permissionContextLoaderProvider,
    permissionDiagnosticServiceProvider,
    permissionServiceProvider,
  ],
  exports: [
    AccessControllerBuilder,
    WorkspacePolicyService,
    PermissionProjectionChecker,
    PermissionSqlPredicateBuilder,
    PermissionDiagnosticService,
    PermissionService,
  ],
})
export class PermissionModule {}

export { AccessControllerBuilder as PermissionAccess } from './builder';
export { PermissionContextLoader } from './context-loader';
export {
  PERMISSION_SHADOW_MISMATCH_CATEGORIES,
  PermissionDiagnosticService,
} from './diagnostic';
export {
  type DotToUnderline,
  mapPermissionsToGraphqlPermissions,
} from './permission-map';
export { WorkspacePolicyService } from './policy';
export { PermissionProjectionChecker } from './projection-checker';
export { PermissionService } from './service';
export { PermissionSqlPredicateBuilder } from './sql-predicate';
export {
  DOC_ACTIONS,
  type DocAction,
  DocRole,
  WORKSPACE_ACTIONS,
  type WorkspaceAction,
  WorkspaceRole,
} from './types';
