# Environment variables

This repo uses Vite for the web/renderer side and Electron for the desktop main process.

## Setup (local dev)

1. Copy `.env.example` to `.env.local` (recommended) or `.env`.
2. Fill in the placeholders.
3. Do **not** commit real values. `.env` / `.env.*` are ignored by git.

## Required variables

### Firebase (Web / Vite)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Optional:

- `VITE_USE_FIREBASE_EMULATOR` (`true` / `false`)

### Desktop (Electron) Google OAuth (PKCE)

Renderer (Vite):

- `VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID`
- `VITE_DESKTOP_GOOGLE_OAUTH_SCOPE` (optional, defaults to `openid email profile`)
- `VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI` (must match the desktop bridge redirect URI)

Main process (Electron):

- `GOOGLE_OAUTH_WEB_CLIENT_SECRET`

Notes:

- Only `VITE_*` variables are exposed to the renderer by Vite.
- Never put secrets in `VITE_*` variables.
