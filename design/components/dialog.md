# Dialog

- Purpose: blocking overlays, confirmations, import flows, and focused editors.
- Base tokens: `semantic.color.background.floating`, `semantic.color.border.floating`, `semantic.radius.dialog`, `semantic.elevation.floating`, `semantic.motion.screenEnter`.
- Current React references: `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx`.
- Interaction states: open, closing, destructive confirmation, non-modal when explicitly allowed.
- Platform note: keyboard avoidance, presentation style, and dismissal gestures remain native.
