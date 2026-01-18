[app]

# Название приложения
title = Saper

# Имя пакета (только буквы, цифры, подчёркивания)
package.name = saper

# Домен пакета (для уникального идентификатора)
package.domain = org.minesweeper

# Исходный код - путь к main.py
source.dir = .

# Включаемые файлы (расширения)
source.include_exts = py,png,jpg,kv,atlas

# Исключаем ненужные файлы
source.exclude_exts = spec,bat,Dockerfile,md,txt

# Версия приложения
version = 1.0.0

# Требования - зависимости
requirements = python3,kivy

# Поддерживаемые ориентации: portrait, landscape, all
orientation = portrait

# Полноэкранный режим: 0 = нет, 1 = да
fullscreen = 0

# Минимальная версия Android API (21 = Android 5.0 Lollipop)
android.minapi = 21

# Целевая версия Android API
android.api = 33

# NDK версия
android.ndk = 25b

# Архитектуры для сборки (arm64-v8a для современных телефонов включая POCO M6 Pro)
android.archs = arm64-v8a, armeabi-v7a

# Разрешения Android
android.permissions = INTERNET

# Режим экрана
android.wakelock = False

# Принимать резервное копирование
android.allow_backup = True

# Цвет пресплеша
android.presplash_color = #2196F3

# Использование AndroidX
android.enable_androidx = True

# Пропустить обновление SDK
android.skip_update = False

# Принять лицензии автоматически
android.accept_sdk_license = True

[buildozer]

# Уровень логирования: 0 = error only, 1 = info, 2 = debug
log_level = 2

# Предупреждать при ошибках
warn_on_root = 0

# Путь для сборки
build_dir = ./.buildozer

# Путь для готового APK
bin_dir = ./bin
