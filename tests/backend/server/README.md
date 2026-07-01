# Backend Server Tests

Backend server tests are centralized in this repository-level `tests` tree.

Do not add new backend tests under `packages/backend/server/src/__tests__`. Put them under `tests/backend/server` instead.

The current `src` segment mirrors `packages/backend/server/src` so existing relative imports and source re-export shims stay predictable while the tests remain outside the package source tree.
