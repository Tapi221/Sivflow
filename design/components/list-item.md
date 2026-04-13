# List Item

- Purpose: explorer rows, selectable entries, menu rows, and meta-panel rows.
- Base tokens: `semantic.color.text.*`, `semantic.color.background.sidebar`, `semantic.color.background.sidebarActive`, `semantic.spacing.controlHeight`, `semantic.radius.control`, `semantic.motion.interactive`.
- Current React references: `src/components/folder/explorer/rows/shared.ts`, `src/components/folder/explorer/rows/DocumentRow.tsx`.
- Interaction states: idle, hover, selected, inline rename, disabled.
- Platform note: row density can vary per platform while preserving shared spacing intent and states.
