@echo off
setlocal
cd /d "%~dp0"

set "SCORE_DUEL_NODE=node"
where node >nul 2>nul
if not errorlevel 1 goto run

rem Use the installed Codex Node runtime if Node is not on the Windows PATH.
set "SCORE_DUEL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%SCORE_DUEL_NODE%" goto run

echo Node.js 20 or newer was not found.
echo Install Node.js from https://nodejs.org/ and run this file again.
pause
exit /b 1

:run
"%SCORE_DUEL_NODE%" scripts\serve.mjs --open
if errorlevel 1 (
  echo.
  echo The local server could not start. See the message above.
  pause
  exit /b 1
)
endlocal
