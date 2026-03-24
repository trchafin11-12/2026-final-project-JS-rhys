@echo off
echo Starting local server...
echo Game will open at http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python first
python -m http.server 3000 2>nul
if errorlevel 1 (
    echo Python not found, trying Python3...
    python3 -m http.server 3000 2>nul
    if errorlevel 1 (
        echo Python3 not found, trying Node.js...
        node server.js 2>nul
        if errorlevel 1 (
            echo No server found. Please install Python or Node.js
            echo Or open index.html directly in your browser (may have security issues)
            pause
        )
    )
)
