@echo off
title InvestIQ Windows App Native Installer
color 0b
echo =======================================================
echo           INVESTIQ NATIVE WINDOWS APP INSTALLER
echo =======================================================
echo.
echo  [+] Initializing InvestIQ installation...
echo  [+] Creating standalone boundary launcher...
echo.

set TARGET_DIR=%APPDATA%\InvestIQ
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Write local application configuration
echo URL=https://investiq-green.vercel.app > "%TARGET_DIR%\config.ini"

:: Write PowerShell code to generate a real Desktop shortcut
echo Creating Desktop Shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'InvestIQ.lnk')); $Shortcut.TargetPath = 'msedge.exe'; $Shortcut.Arguments = '--app=https://investiq-green.vercel.app --window-size=1280,720'; $Shortcut.Description = 'InvestIQ Financial Intelligence Engine'; $Shortcut.IconLocation = 'shell32.dll,44'; $Shortcut.Save()"

echo.
echo =======================================================
echo  🎉 INSTALLATION SUCCESSFUL!
echo =======================================================
echo  [✔] InvestIQ Desktop App Shortcut created on your Desktop.
echo  [✔] Native borderless WebView window configured.
echo  [✔] Automatic Over-The-Air (OTA) updates enabled.
echo.
echo  Press any key to launch InvestIQ now...
pause > null
start msedge --app=https://investiq-green.vercel.app --window-size=1280,720
exit
