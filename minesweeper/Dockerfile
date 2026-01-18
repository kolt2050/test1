# Dockerfile для сборки APK с помощью Buildozer
# Используем готовый образ с предустановленными зависимостями
FROM kivy/buildozer:latest

# Создание рабочей директории
WORKDIR /home/user/hostcwd

# Копирование файлов проекта
COPY --chown=user:user main.py .
COPY --chown=user:user buildozer.spec .

# Установка переменных окружения
ENV BUILDOZER_WARN_ON_ROOT=0

# Команда сборки
CMD ["buildozer", "android", "debug"]
