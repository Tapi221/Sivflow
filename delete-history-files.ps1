$ErrorActionPreference = 'Stop'

$filesToDelete = @(
  'src/components/explorer/ExplorerTabs.tsx',
  'src/components/explorer/RecentPanel.tsx'
)

foreach ($relativePath in $filesToDelete) {
  if (Test-Path -LiteralPath $relativePath) {
    Remove-Item -LiteralPath $relativePath -Force
  }
}
