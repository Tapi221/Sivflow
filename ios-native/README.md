# FlashCardMaster iOS Native

This overwrite package upgrades the previous parity build with two missing cloud pieces that mattered:

- Google popup sign-in on iOS using `ASWebAuthenticationSession`
- Automatic Firestore live-merge sync instead of manual-only push/pull habits

## Included routes

- Library
- Study
- Search
- Tags
- Calendar
- Directory
- Gallery
- Questions
- Dictionary
- Tag Map
- Trash
- Settings

## Included capabilities

- Folder / card set / card / tag CRUD
- Study queue with spaced-review grading
- Soft delete + restore + purge
- Local JSON persistence
- Import / export snapshot
- Theme switching
- Gallery cards via image URLs
- Review calendar
- XLSX import for the workbook format used by the Electron/React importer
- PDF preview from remote URLs or imported local files

## Cloud/auth changes in this overwrite

- Firebase email/password auth via REST
- Google popup sign-in via Google OAuth + Firebase `signInWithIdp`
- Automatic Firestore merge sync with background polling, local auto-push, and per-entity merge rules
- Tombstone-aware sync for folder / card set / tag / permanent card deletion

## Google Cloud setup

In the OAuth client used by this app, authorize this redirect URI:

`com.akari221.flashcardmasternative.auth:/oauth2redirect`

Then open Settings in the app and fill in:

- Firebase Web API Key
- Firebase Project ID
- Google OAuth Client ID
- Google Redirect Scheme (defaults to `com.akari221.flashcardmasternative.auth`)

## Live sync behavior

When Live Merge Sync is enabled:

- local writes debounce and auto-push
- remote Firestore changes are polled in the background
- snapshots are merged entity-by-entity using `updatedAt`
- deletion tombstones prevent old remote objects from resurrecting after delete

## Still intentionally not identical to Electron/React

- No BlockNote-compatible rich text / code / math editing surface
- No PDF block editor identical to the web build
- No Firebase SDK dependency; cloud integration stays self-contained in Swift so the overwrite remains portable

It is a much less polite compromise now, which is usually how software gets useful.
