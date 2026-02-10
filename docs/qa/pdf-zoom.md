# PDF Zoom Manual QA

## Windows (Chrome / Edge)

- Place cursor over PDF area, then use `Ctrl + Wheel`:
  PDF zoom changes, browser/page zoom does not change.
- Place cursor outside PDF area, then use `Ctrl + Wheel`:
  browser zoom works normally.
- At PDF top/bottom edge, spin wheel repeatedly:
  no scroll chaining to parent pane/page.

## macOS (Chrome)

- Over PDF area, use `Cmd + Wheel`:
  only PDF zoom changes.
- Over PDF area, use trackpad pinch:
  only PDF zoom changes.

## macOS (Safari)

- On environments where gesture events are supported, pinch over PDF area:
  only PDF zoom changes.

