@echo off
echo ==============================================
echo Compilando MaskayPet APK (Android)
echo ==============================================

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
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

echo [3/3] Ensamblando APK con Gradle...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [ERROR] Fallo el ensamble del APK.
    pause
    exit /b %errorlevel%
)

copy /y "%~dp0frontend\android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0MaskayPet.apk"
echo.
echo =======================================================
echo EXITO: APK listo en la carpeta principal: MaskayPet.apk
echo =======================================================
pause
