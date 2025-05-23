@echo off
echo Starting Backend and Frontend services...

:: Start Backend Service
cd /d C:\Users\edusp\projectes\distribucio_taules\backend
start cmd /k "echo Starting Backend Service... && npm start"

:: Start Frontend Service
cd /d C:\Users\edusp\projectes\distribucio_taules\frontend
start cmd /k "echo Starting Frontend Service... && npm start"

echo Services are starting in separate windows.
echo Press any key to exit this window...
pause > nul