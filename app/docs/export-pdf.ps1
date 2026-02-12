$ErrorActionPreference = "Stop"

# Botz documentation exporter (separate PDFs)
# Output: docs/_pdf/

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outDir = Join-Path $PSScriptRoot "_pdf"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$css = Join-Path $PSScriptRoot "_styles\botz.css"

$diagInDir = Join-Path $PSScriptRoot "_diagrams"
$diagOutDir = Join-Path $diagInDir "out"
New-Item -ItemType Directory -Force -Path $diagOutDir | Out-Null

Write-Host "Rendering diagrams..." -ForegroundColor Cyan
npx --yes @mermaid-js/mermaid-cli -i (Join-Path $diagInDir "architecture.mmd") -o (Join-Path $diagOutDir "architecture.svg") --quiet
npx --yes @mermaid-js/mermaid-cli -i (Join-Path $diagInDir "daily-flow.mmd") -o (Join-Path $diagOutDir "daily-flow.svg") --quiet
npx --yes @mermaid-js/mermaid-cli -i (Join-Path $diagInDir "metrics.mmd") -o (Join-Path $diagOutDir "metrics.svg") --quiet
npx --yes @mermaid-js/mermaid-cli -i (Join-Path $diagInDir "integrations.mmd") -o (Join-Path $diagOutDir "integrations.svg") --quiet
npx --yes @mermaid-js/mermaid-cli -i (Join-Path $diagInDir "mortgage-engine.mmd") -o (Join-Path $diagOutDir "mortgage-engine.svg") --quiet

$docs = @(
  "00-PORTADA.md",
  "01-PRODUCTO.md",
  "02-ARQUITECTURA.md",
  "03-PROCESOS-CRM-KANBAN-SLA.md",
  "04-METRICAS.md",
  "05-INTEGRACIONES.md",
  "06-SEGURIDAD.md",
  "07-DEPLOY.md",
  "08-BROCHURE.md",
  "09-SALES-DECK.md",
  "10-MOTOR-HIPOTECARIO.md"
)

Write-Host "Exporting PDFs to $outDir" -ForegroundColor Cyan

foreach ($doc in $docs) {
  $inFile = Join-Path $PSScriptRoot $doc
  $base = [System.IO.Path]::GetFileNameWithoutExtension($doc)
  $outFile = Join-Path $outDir ("BOTZ-" + $base + ".pdf")

  Write-Host "- $doc -> $(Split-Path -Leaf $outFile)" -ForegroundColor Gray

  # md-to-pdf writes output next to the md file
  Push-Location $PSScriptRoot
  npx --yes md-to-pdf $doc --basedir $repoRoot --stylesheet $css | Out-Null
  Pop-Location

  $generatedPdf = Join-Path $PSScriptRoot ($base + ".pdf")
  if (Test-Path $generatedPdf) {
    Move-Item -Force $generatedPdf $outFile
  } else {
    throw "PDF not generated for $doc"
  }
}

Write-Host "Done." -ForegroundColor Green
