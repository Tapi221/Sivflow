# Deploy Runbook

## Scope

This runbook covers RC/prod deployment for:

- Hosting (frontend)
- Functions (backend)
- Rollback flow

## Preconditions

1. Working tree is clean for deploy-relevant files.
2. Preflight passes:
   - `npm run preflight`
3. Target Firebase project is selected:
   - `firebase use <alias-or-project-id>`
4. For PPTX converter changes, validate endpoint and secrets:
   - `node scripts/predeploy-check.mjs`

## Deploy Steps

### 1. Build and verify

```bash
npm run preflight
```

### 2. Deploy Functions

```bash
firebase deploy --only functions --project <project-id>
```

### 3. Deploy Hosting

```bash
firebase deploy --only hosting --project <project-id>
```

### 4. Post-deploy smoke

1. Open app and verify login + dashboard load.
2. Run `docs/qa/smoke-rc.2.md`.
3. For PPTX path, verify conversion status transitions in Firestore:
   - `queued -> processing -> ready` (or expected failure in failure scenario).

## Rollback

### Hosting rollback

1. Open Firebase Hosting release history.
2. Promote previous known-good release.
3. Verify smoke scenarios.

### Functions rollback

1. Roll back by redeploying previous known-good commit/tag:
   - `git checkout <tag-or-commit>`
   - `firebase deploy --only functions --project <project-id>`
2. Re-run smoke checks.

## Notes

- Existing Vite chunk warnings are known and non-blocking unless behavior regressions are observed.
- Do not deploy with unresolved secret/config warnings from `predeploy-check`.
