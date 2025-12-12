@echo off
echo ========================================
echo PairFX - Running All Tests
echo ========================================
echo.

cd /d E:\dev\pairfx-live

echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing dependencies if needed...
if not exist "node_modules\" (
    npm install
)

echo.
echo ========================================
echo Running ALL Tests
echo ========================================
npm test

echo.
echo ========================================
echo Test Results Above
echo ========================================
echo.
echo Press any key to see use case tests...
pause >nul

echo.
echo ========================================
echo Running Use Case Tests
echo ========================================
npm run test:use-cases

echo.
echo ========================================
echo All Tests Complete
echo ========================================
pause

