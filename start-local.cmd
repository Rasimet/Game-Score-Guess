@echo off
setlocal
title Score Duel - Local Server
cd /d "%~dp0" || goto folder_error
echo.
echo Score Duel - Steam Review Guessing Game
echo Project: %~dp0
echo Game URL: http://127.0.0.1:4173/
echo.
echo Starting the server and opening your browser...
echo If no browser appears, open the Game URL above manually.
echo Keep the server window open while playing.
echo.

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
set "SCORE_DUEL_EXIT=%ERRORLEVEL%"
echo.
if not "%SCORE_DUEL_EXIT%"=="0" echo The local server could not start. See the message above.
if "%SCORE_DUEL_EXIT%"=="0" echo The launch command has finished. If the game is already running, keep its original server window open.
echo Game URL: http://127.0.0.1:4173/
echo Press any key to close this launcher window.
pause >nul
exit /b %SCORE_DUEL_EXIT%

:folder_error
echo Could not open the project folder. Move the whole project together and try again.
pause
exit /b 1
endlocal
