@echo off
echo ==============================================
echo Compilando MaskayPet APK (Android Release)
echo ==============================================

set "JAVA_HOME=C:\Users\murci\.jdks\jbr-21.0.11"
cd /d "%~dp0\frontend"

echo [1/3] Compilando frontend Web...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion del frontend.
    pause
    exit /b %errorlevel%
)

echo [2/3] Sincronizando con Capacitor Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la sincronizacion con Capacitor.
    pause
    exit /b %errorlevel%
)

echo [3/3] Ensamblando APK firmado (Release)...
cd android
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo [ERROR] Fallo el ensamble del APK.
    pause
    exit /b %errorlevel%
)

copy /y "%~dp0frontend\android\app\build\outputs\apk\release\app-release.apk" "%~dp0MaskayPet.apk"
echo.
echo =======================================================
echo EXITO: APK Release firmado en: MaskayPet.apk
echo =======================================================
pause
