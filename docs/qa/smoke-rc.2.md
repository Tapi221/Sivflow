# RC.2 Smoke Test

## Target

- Release candidate: `prod-2026-02-10-rc.2`
- Focus: PDF zoom confinement and PPTX converter flow

## PDF Smoke

1. Open a PDF document in the viewer.
2. In PDF region:
   - `Ctrl/Cmd + Wheel` changes PDF zoom only.
   - Trackpad pinch changes PDF zoom only.
3. Confirm browser/page-level zoom does not trigger while pointer is inside PDF region.
4. Confirm parent panes do not scroll-chain while zooming/scrolling at PDF edges.
5. In non-PDF region:
   - `Ctrl/Cmd + Wheel` behaves as normal browser zoom.

## PPTX Smoke

1. Upload a PPTX file from folder explorer.
2. Confirm document entry appears and upload status progresses.
3. Confirm conversion state progresses:
   - `queued -> processing -> ready`
4. Open PPTX viewer and verify slides are rendered.
5. Failure path check (optional):
   - Run failure E2E script and confirm status transitions to `failed` with converter error.

## Pass Criteria

- PDF input confinement works only in viewer area.
- PPTX conversion path is functional end-to-end for success case.
- No critical console/runtime errors during smoke flow.
