import {
  type DialogComponentProps,
  type GLOBAL_DIALOG_SCHEMA,
  GlobalDialogService,
  WorkspaceDialogService,
} from '@affine/core/modules/dialogs';
import type { WORKSPACE_DIALOG_SCHEMA } from '@affine/core/modules/dialogs/constant';
import { useLiveData, useService } from '@toeverything/infra';
import { lazy, Suspense } from 'react';

const CreateWorkspaceDialog = lazy(() =>
  import('./create-workspace').then(module => ({
    default: module.CreateWorkspaceDialog,
  }))
);
const ImportWorkspaceDialog = lazy(() =>
  import('./import-workspace').then(module => ({
    default: module.ImportWorkspaceDialog,
  }))
);
const ImportTemplateDialog = lazy(() =>
  import('./import-template').then(module => ({
    default: module.ImportTemplateDialog,
  }))
);
const SignInDialog = lazy(() =>
  import('./sign-in').then(module => ({
    default: module.SignInDialog,
  }))
);
const ChangePasswordDialog = lazy(() =>
  import('./change-password').then(module => ({
    default: module.ChangePasswordDialog,
  }))
);
const VerifyEmailDialog = lazy(() =>
  import('./verify-email').then(module => ({
    default: module.VerifyEmailDialog,
  }))
);
const EnableCloudDialog = lazy(() =>
  import('./enable-cloud').then(module => ({
    default: module.EnableCloudDialog,
  }))
);
const DeletedAccountDialog = lazy(() =>
  import('./deleted-account').then(module => ({
    default: module.DeletedAccountDialog,
  }))
);
const DocInfoDialog = lazy(() =>
  import('./doc-info').then(module => ({
    default: module.DocInfoDialog,
  }))
);
const CollectionEditorDialog = lazy(() =>
  import('./collection-editor').then(module => ({
    default: module.CollectionEditorDialog,
  }))
);
const TagSelectorDialog = lazy(() =>
  import('./selectors/tag').then(module => ({
    default: module.TagSelectorDialog,
  }))
);
const DocSelectorDialog = lazy(() =>
  import('./selectors/doc').then(module => ({
    default: module.DocSelectorDialog,
  }))
);
const CollectionSelectorDialog = lazy(() =>
  import('./selectors/collection').then(module => ({
    default: module.CollectionSelectorDialog,
  }))
);
const DateSelectorDialog = lazy(() =>
  import('./selectors/date').then(module => ({
    default: module.DateSelectorDialog,
  }))
);
const SettingDialog = lazy(() =>
  import('./setting').then(module => ({
    default: module.SettingDialog,
  }))
);
const ImportDialog = lazy(() =>
  import('./import').then(module => ({
    default: module.ImportDialog,
  }))
);

const GLOBAL_DIALOGS = {
  'create-workspace': CreateWorkspaceDialog,
  'import-workspace': ImportWorkspaceDialog,
  'import-template': ImportTemplateDialog,
  'sign-in': SignInDialog,
  'change-password': ChangePasswordDialog,
  'verify-email': VerifyEmailDialog,
  'enable-cloud': EnableCloudDialog,
  'deleted-account': DeletedAccountDialog,
} satisfies {
  [key in keyof GLOBAL_DIALOG_SCHEMA]?: React.FC<
    DialogComponentProps<GLOBAL_DIALOG_SCHEMA[key]>
  >;
};

const WORKSPACE_DIALOGS = {
  'doc-info': DocInfoDialog,
  'collection-editor': CollectionEditorDialog,
  'tag-selector': TagSelectorDialog,
  'doc-selector': DocSelectorDialog,
  'collection-selector': CollectionSelectorDialog,
  'date-selector': DateSelectorDialog,
  setting: SettingDialog,
  import: ImportDialog,
} satisfies {
  [key in keyof WORKSPACE_DIALOG_SCHEMA]?: React.FC<
    DialogComponentProps<WORKSPACE_DIALOG_SCHEMA[key]>
  >;
};

export const GlobalDialogs = () => {
  const globalDialogService = useService(GlobalDialogService);
  const dialogs = useLiveData(globalDialogService.dialogs$);
  return (
    <>
      {dialogs.map(dialog => {
        const DialogComponent =
          GLOBAL_DIALOGS[dialog.type as keyof typeof GLOBAL_DIALOGS];
        if (!DialogComponent) {
          return null;
        }
        return (
          <Suspense fallback={null} key={dialog.id}>
            <DialogComponent
              {...(dialog.props as any)}
              close={(result?: unknown) => {
                globalDialogService.close(dialog.id, result);
              }}
            />
          </Suspense>
        );
      })}
    </>
  );
};

export const WorkspaceDialogs = () => {
  const workspaceDialogService = useService(WorkspaceDialogService);
  const dialogs = useLiveData(workspaceDialogService.dialogs$);
  return (
    <>
      {dialogs.map(dialog => {
        const DialogComponent =
          WORKSPACE_DIALOGS[dialog.type as keyof typeof WORKSPACE_DIALOGS];
        if (!DialogComponent) {
          return null;
        }
        return (
          <Suspense fallback={null} key={dialog.id}>
            <DialogComponent
              {...(dialog.props as any)}
              close={(result?: unknown) => {
                workspaceDialogService.close(dialog.id, result);
              }}
            />
          </Suspense>
        );
      })}
    </>
  );
};
