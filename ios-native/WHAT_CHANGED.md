# What changed in this cloud/auth repair overwrite

## Fixed from the previous zip

- Added Google popup sign-in using `ASWebAuthenticationSession`
- Added automatic Firestore merge sync with background watcher behavior
- Added sync tombstones so deleted folders, card sets, tags, and permanently removed cards do not reappear from stale remote state
- Added explicit `Info.plist` callback URL scheme for Google OAuth

## Data model changes

- `StudySnapshot.syncState`
- `deletedFolderTimestamps`
- `deletedCardSetTimestamps`
- `deletedTagTimestamps`
- `deletedCardTimestamps`

## Sync behavior

- local persist posts store notifications
- Firebase sync manager observes local writes
- writes are debounced and uploaded automatically
- remote payloads are merged instead of blindly replacing local state
- legacy cloud documents from the older snapshot-only format are still readable

## Why it changed this way

The earlier zip handled cloud sync like a manual shovel. This version behaves more like a real client: sign in, edit, and let the app keep the snapshot converging without pretending that placeholder text counts as architecture.
