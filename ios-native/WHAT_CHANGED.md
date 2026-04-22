# What changed in this parity-oriented iOS overwrite

## Core direction
The previous zip delivered a clean local card app, but it was not close enough to the Electron/React route surface. This overwrite pushes the iOS version toward route parity and feature discoverability.

## Added or expanded
- Study route with grading buttons and review scheduling
- Calendar route for due cards
- Directory route for folders / sets / tags overview
- Gallery route for image-backed cards
- Questions route for prompt-first browsing
- Dictionary route from local study content
- Tag Map route for tag-to-card-set relationships
- Trash route with restore and permanent delete
- Card editor fields for notes, image URL, source URL, review date
- Soft-delete workflow instead of immediate hard delete

## Data model changes
- `nextReviewAt`
- `lastStudiedAt`
- `studyCount`
- `deletedAt`
- `noteText`
- `imageURL`
- `sourceURL`

## Honest gap list
Still not 1:1 with Electron/React:
- No Firebase authentication
- No cloud sync
- No XLSX import workflow
- No PDF block tooling
- No BlockNote-compatible rich editor surface

That is deliberate. Shipping a stable overwrite package beats pretending the missing integrations exist.
