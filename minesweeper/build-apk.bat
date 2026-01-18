@echo off
echo ========================================
echo    Сборка APK для игры Сапёр
echo ========================================
echo.

REM Проверка Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Docker не установлен или не запущен!
    echo Установите Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/3] Сборка Docker образа...
docker build -t minesweeper-builder .

if errorlevel 1 (
    echo ОШИБКА: Не удалось собрать Docker образ
    pause
    exit /b 1
)

echo.
echo [2/3] Запуск сборки APK (это займёт 20-40 минут при первом запуске)...
echo.

REM Создаём папку bin если её нет
if not exist "bin" mkdir bin

REM Запускаем контейнер с маунтом для сохранения APK
docker run --rm -v "%cd%\bin:/app/bin" minesweeper-builder

if errorlevel 1 (
    echo ОШИБКА: Сборка APK не удалась
    pause
    exit /b 1
)

echo.
echo [3/3] Готово!
echo.
echo ========================================
echo APK файл находится в папке: %cd%\bin
echo ========================================
dir bin\*.apk 2>nul

echo.
pause
