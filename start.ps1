# Start PairFX Applicatie

Write-Host "🚀 Starting PairFX Development Server..." -ForegroundColor Green
Write-Host ""
Write-Host "De applicatie start op: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Druk op Ctrl+C om de server te stoppen" -ForegroundColor Yellow
Write-Host ""

# Check of Python beschikbaar is
if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 8000
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 -m http.server 8000
} else {
    Write-Host "❌ Python niet gevonden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternatieve opties:" -ForegroundColor Yellow
    Write-Host "1. Installeer Python van https://www.python.org/" -ForegroundColor White
    Write-Host "2. Gebruik VS Code Live Server extensie" -ForegroundColor White
    Write-Host "3. Open index.html direct in browser (kan module issues geven)" -ForegroundColor White
    Write-Host ""
    Read-Host "Druk op Enter om te sluiten"
}

