@echo off
cd /d "%~dp0.."
call node_modules\.bin\electron.cmd publicador
if errorlevel 1 pause
