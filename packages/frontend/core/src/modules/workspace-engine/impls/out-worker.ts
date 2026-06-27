import { getWorkerUrl } from '@affine/env/worker';
import { OpClient } from '@toeverything/infra/op';

import type { WorkerOps } from './worker-ops';

let worker: OpClient<WorkerOps> | undefined;

function createWorkspaceProfileWorker() {
  if (import.meta.env.DEV) {
    return new Worker(new URL('./workspace-profile.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  return new Worker(getWorkerUrl('workspace-profile'));
}

export function getWorkspaceProfileWorker() {
  if (worker) {
    return worker;
  }

  const rawWorker = createWorkspaceProfileWorker();

  worker = new OpClient<WorkerOps>(rawWorker);
  return worker;
}
