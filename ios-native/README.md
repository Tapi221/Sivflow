# FlashCardMaster iOS Native

This overwrite package replaces the old unfinished `ios-native` skeleton with a local-first iOS app that aligns more closely with the Electron/React information architecture.

Included routes:
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

Included capabilities:
- Folder / card set / card / tag CRUD
- Study queue with spaced-review grading
- Soft delete + restore + purge
- Local JSON persistence
- Import / export snapshot
- Theme switching
- Gallery cards via image URLs
- Review calendar

Included cloud and file features:
- Firebase email/password auth
- Firestore whole-snapshot push/pull sync
- XLSX import for the workbook format used by the Electron/React importer
- PDF preview from remote URLs or imported local files

Still intentionally not included:
- Google popup Sign-In parity
- BlockNote-compatible rich text / code / math editing surface

The point is to give you a real app you can overwrite with now, not another polite pile of placeholder docs.
