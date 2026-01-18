# 💣 Сапёр (Minesweeper) для Android

Классическая игра "Сапёр" для Android, написанная на Python с использованием Kivy.

## Особенности

- 🎮 Три уровня сложности: Лёгкий, Средний, Сложный
- ⏱️ Таймер игры
- 🚩 Установка флагов долгим нажатием
- 📱 Оптимизировано для POCO M6 Pro и других Android устройств
- 🎨 Современный интерфейс

## Управление

- **Короткое нажатие** — открыть ячейку
- **Долгое нажатие (> 0.5 сек)** — установить/снять флаг

## Сборка APK

### Требования

- Linux или WSL2 (Windows Subsystem for Linux)
- Python 3.8+
- Buildozer
- Android SDK & NDK (устанавливается автоматически)

### Шаг 1: Установка зависимостей (Ubuntu/Debian/WSL2)

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка зависимостей
sudo apt install -y \
    python3-pip \
    python3-setuptools \
    python3-venv \
    git \
    zip \
    unzip \
    openjdk-17-jdk \
    autoconf \
    libtool \
    pkg-config \
    zlib1g-dev \
    libncurses5-dev \
    libncursesw5-dev \
    libtinfo5 \
    cmake \
    libffi-dev \
    libssl-dev \
    automake

# Установка buildozer и cython
pip3 install --user --upgrade buildozer cython virtualenv
```

### Шаг 2: Сборка APK

```bash
# Перейти в папку проекта
cd minesweeper

# Сборка debug APK (первая сборка займёт 20-40 минут)
buildozer android debug

# Или сборка release APK (для публикации)
# buildozer android release
```

### Шаг 3: Установка на телефон

После успешной сборки APK будет в папке `bin/`:

```bash
# Найти APK
ls bin/*.apk

# Установка через ADB (если телефон подключен)
adb install bin/saper-1.0.0-arm64-v8a-debug.apk
```

Или просто скопируйте APK файл на телефон и установите вручную.

## Быстрый способ сборки (Google Colab)

Если у вас нет Linux, можно собрать APK в Google Colab:

1. Откройте [Google Colab](https://colab.research.google.com/)
2. Создайте новый notebook
3. Выполните следующий код:

```python
# Установка buildozer
!pip install buildozer cython

# Установка зависимостей
!sudo apt-get install -y \
    python3-pip \
    git \
    zip \
    unzip \
    openjdk-17-jdk \
    autoconf \
    libtool \
    pkg-config \
    zlib1g-dev \
    libncurses5-dev \
    libncursesw5-dev \
    cmake \
    libffi-dev \
    libssl-dev

# Загрузка проекта (замените на свой репозиторий или загрузите файлы)
!mkdir -p minesweeper
# Скопируйте main.py и buildozer.spec в папку minesweeper

# Сборка
%cd minesweeper
!buildozer android debug

# Скачивание APK
from google.colab import files
files.download('bin/saper-1.0.0-arm64-v8a-debug.apk')
```

## Настройки для POCO M6 Pro

Телефон POCO M6 Pro использует процессор MediaTek Helio G99 с архитектурой ARM64.
В `buildozer.spec` уже настроены правильные архитектуры:

```
android.archs = arm64-v8a, armeabi-v7a
```

## Тестирование на ПК

Для тестирования на компьютере перед сборкой:

```bash
# Установка Kivy
pip install kivy

# Запуск игры
cd minesweeper
python main.py
```

## Структура проекта

```
minesweeper/
├── main.py           # Основной код игры
├── buildozer.spec    # Конфигурация для сборки APK
├── requirements.txt  # Зависимости Python
└── README.md         # Этот файл
```

## Решение проблем

### Ошибка "No module named 'kivy'"
```bash
pip install kivy
```

### Ошибка buildozer на Windows
Buildozer работает только на Linux. Используйте WSL2 или Google Colab.

### APK не устанавливается на телефоне
1. Включите "Установка из неизвестных источников" в настройках
2. Убедитесь, что скачали APK с архитектурой arm64-v8a

## Лицензия

MIT License - свободно используйте и модифицируйте!
