
```text
apps/
  web/
    index.html
    public/
    src/
      main.tsx
      App.tsx

  desktop/
    src-tauri/
      Cargo.toml
      tauri.conf.json
      src/
        main.rs

  mobile/
    app.json
    src/
      App.tsx
      navigation/
      screens/
    ios/
      Manifolia/
        NativeModules/
        NativeViews/
        Assets.xcassets/
    android/

packages/
  web-renderer/
    src/
      AppShell.tsx
      routes/
      features/
      components/

  mobile-renderer/
    src/
      AppShell.tsx
      screens/
      components/

  core/
    src/
      domain/
      usecases/
      models/
      validation/

  platform/
    src/
      auth/
      storage/
      calendar/
      files/
      shell/

shared/
  assets/
    icons/
      app-icon.svg

  schemas/
    card.schema.json
    deck.schema.json

  design-tokens/
    colors.json
    spacing.json
    typography.json
```