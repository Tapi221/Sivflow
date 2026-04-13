# Design System Architecture

## Goal

This repository keeps UI implementation platform-specific while introducing a shared design contract for React, SwiftUI, and Jetpack Compose.

## Shared vs not shared

### Shared

- `design/tokens/*.json`: source-of-truth primitives and semantic aliases.
- `design/components/*.md`: component-level contracts for state names and token usage.
- `design/patterns/*.md`: layout and composition guidance for the same product structure across platforms.
- Generated outputs:
  - `src/presentation/react/theme/`
  - `ios/App/DesignSystem/Tokens/`
  - `android/app/src/main/java/com/akari221/flashcardmaster/designsystem/tokens/`

### Not shared

- React JSX, hooks, routes, and feature wiring.
- Future SwiftUI view trees and Jetpack Compose composables.
- Electron-specific chrome such as `src/layout/TitleBar.tsx`.
- Platform navigation, gestures, focus handling, accessibility APIs, and window management.

## Token flow

1. Edit design tokens in `design/tokens/*.json`.
2. Run `npm run design-tokens:build`.
3. `tools/design-tokens/build-tokens.ts` resolves semantic references.
4. The build writes platform outputs:
   - React CSS variables and a typed token export
   - Swift token constants
   - Compose token constants
5. Each platform consumes its own generated output without sharing screen code.

## Current extraction baseline

The initial token values were copied from the current React app so behavior stays stable:

- primary color ramp and UI spacing from `src/styles/tokens/tokens.css`
- surface elevation and floating surface values from `src/styles/tokens/tokens.css` and `src/styles/base/utilities.css`
- base shadows and radii from `tailwind.config.js`
- typography family roles from `src/styles/tokens/typography.ts` and `src/styles/components/common.css`

## React direction

- `src/presentation/react/theme/` now exists as the generated theme output target.
- Current React UI stays on existing classes and CSS variables for now.
- Future React migration should move component-by-component to generated theme consumption instead of doing a broad rewrite.

## Native direction

- `ios/App/DesignSystem/` is reserved for SwiftUI-native token, component, and pattern adoption.
- `android/app/src/main/java/com/akari221/flashcardmaster/designsystem/` is reserved for Compose-native token, component, and pattern adoption.
- Native UI code should map shared tokens to native APIs, not attempt to reuse React markup or styling primitives directly.

## Migration plan

1. Adopt generated React tokens in one low-risk primitive such as button or dialog.
2. Add SwiftUI token wrappers that convert generated values into `Color`, `Font`, and spacing helpers.
3. Add Compose token wrappers that convert generated values into `Color`, `TextStyle`, and spacing helpers.
4. Port one narrow shared pattern such as a dialog or list row per platform.
5. Expand component coverage only after each platform proves the contract is sufficient.
