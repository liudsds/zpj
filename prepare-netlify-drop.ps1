$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $root 'netlify-drop-build'
$topLevelFiles = @(
  'index.html',
  'styles.css',
  'app.js',
  'portfolio-data.js'
)
if (Test-Path -LiteralPath $outDir) {
  Remove-Item -LiteralPath $outDir -Recurse -Force
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

foreach ($file in $topLevelFiles) {
  $source = Join-Path $root $file
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Missing required file: $file"
  }
  Copy-Item -LiteralPath $source -Destination (Join-Path $outDir $file) -Force
}

$dirsToCopy = Get-ChildItem -LiteralPath $root -Directory | Where-Object {
  $_.Name -eq 'assets' -or
  $_.Name -like 'AI*' -or
  $_.Name -like 'UI*' -or
  $_.Name -match '[^\u0000-\u007F]'
}

foreach ($dir in $dirsToCopy) {
  Copy-Item -LiteralPath $dir.FullName -Destination (Join-Path $outDir $dir.Name) -Recurse -Force
}

$files = Get-ChildItem -LiteralPath $outDir -Recurse -File
$count = ($files | Measure-Object).Count
$size = [math]::Round((($files | Measure-Object -Property Length -Sum).Sum / 1MB), 1)

Write-Host "Prepared Netlify bundle: $outDir"
Write-Host "Files: $count"
Write-Host "Size: $size MB"
