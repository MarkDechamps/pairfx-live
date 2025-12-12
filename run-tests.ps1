# PairFX Test Runner
# Quick test execution script

Write-Host "🧪 PairFX Test Suite" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Display menu
Write-Host "Select test option:" -ForegroundColor Green
Write-Host "1. Run all tests" -ForegroundColor White
Write-Host "2. Run tests with coverage" -ForegroundColor White
Write-Host "3. Run tests in watch mode" -ForegroundColor White
Write-Host "4. Run specific test file" -ForegroundColor White
Write-Host "5. Run model tests only" -ForegroundColor White
Write-Host "6. Run service tests only" -ForegroundColor White
Write-Host "7. Run integration tests only" -ForegroundColor White
Write-Host "8. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-8)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "▶️  Running all tests..." -ForegroundColor Cyan
        npm test
    }
    "2" {
        Write-Host ""
        Write-Host "▶️  Running tests with coverage..." -ForegroundColor Cyan
        npm run test:coverage
        Write-Host ""
        Write-Host "📊 Opening coverage report..." -ForegroundColor Green
        if (Test-Path "coverage/lcov-report/index.html") {
            Start-Process "coverage/lcov-report/index.html"
        }
    }
    "3" {
        Write-Host ""
        Write-Host "▶️  Running tests in watch mode..." -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        npm run test:watch
    }
    "4" {
        Write-Host ""
        Write-Host "Available test files:" -ForegroundColor Yellow
        Write-Host "  1. Player.test.js" -ForegroundColor White
        Write-Host "  2. Match.test.js" -ForegroundColor White
        Write-Host "  3. Tournament.test.js" -ForegroundColor White
        Write-Host "  4. PairingService.test.js" -ForegroundColor White
        Write-Host "  5. StorageService.test.js" -ForegroundColor White
        Write-Host "  6. integration.test.js" -ForegroundColor White
        Write-Host ""
        $file = Read-Host "Enter file number (1-6)"

        $testFiles = @(
            "tests/models/Player.test.js",
            "tests/models/Match.test.js",
            "tests/models/Tournament.test.js",
            "tests/services/PairingService.test.js",
            "tests/services/StorageService.test.js",
            "tests/integration.test.js"
        )

        if ($file -ge 1 -and $file -le 6) {
            Write-Host ""
            Write-Host "▶️  Running $($testFiles[$file-1])..." -ForegroundColor Cyan
            npx jest $testFiles[$file-1]
        } else {
            Write-Host "Invalid choice" -ForegroundColor Red
        }
    }
    "5" {
        Write-Host ""
        Write-Host "▶️  Running model tests..." -ForegroundColor Cyan
        npx jest tests/models/
    }
    "6" {
        Write-Host ""
        Write-Host "▶️  Running service tests..." -ForegroundColor Cyan
        npx jest tests/services/
    }
    "7" {
        Write-Host ""
        Write-Host "▶️  Running integration tests..." -ForegroundColor Cyan
        npx jest tests/integration.test.js
    }
    "8" {
        Write-Host "👋 Goodbye!" -ForegroundColor Cyan
        exit
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"

