# 🚀 Гайд: Первый Релиз на NPM

Пошаговая инструкция для публикации `vitest-react-profiler` v1.0.0 на npm.

---

## 📋 Чеклист Готовности

Перед релизом убедись что все готово:

- [x] ✅ Код запушен в GitHub
- [x] ✅ Все тесты проходят (95 tests, 100% coverage)
- [x] ✅ Build работает без ошибок
- [x] ✅ CHANGELOG.md заполнен для v1.0.0
- [x] ✅ package.json version = "1.0.0"
- [x] ✅ Git hooks настроены (pre-commit, pre-push)
- [x] ✅ GitHub workflows созданы
- [ ] 🔲 NPM аккаунт создан
- [ ] 🔲 GitHub Secrets настроены
- [ ] 🔲 Codecov настроен

---

## Этап 1️⃣: Регистрация на NPM

### 1.1 Создай NPM аккаунт

1. Перейди на: https://www.npmjs.com/signup
2. Заполни форму:
   - **Username**: выбери уникальное имя
   - **Email**: твой email
   - **Password**: надежный пароль
3. Подтверди email (проверь почту)

### 1.2 Включи 2FA (двухфакторная аутентификация)

⚠️ **ВАЖНО**: npm требует 2FA для публикации пакетов

1. Зайди в: https://www.npmjs.com/settings/YOUR_USERNAME/profile
2. Нажми **"Two-Factor Authentication"**
3. Выбери **"Authorization and Publishing"** (не только auth!)
4. Отсканируй QR-код приложением (Google Authenticator, Authy, 1Password)
5. Введи код для подтверждения
6. **СОХРАНИ recovery codes!**

### 1.3 Создай Access Token

1. Перейди в: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Нажми **"Generate New Token"**
3. Выбери **"Automation"** (для CI/CD)
4. Скопируй токен **НЕМЕДЛЕННО** (больше не покажется!)
5. Сохрани в безопасном месте

---

## Этап 2️⃣: Настройка GitHub Secrets

### 2.1 Добавь NPM_TOKEN

1. Открой: https://github.com/greydragon888/vitest-react-profiler/settings/secrets/actions
2. Нажми **"New repository secret"**
3. Заполни:
   - **Name**: `NPM_TOKEN`
   - **Secret**: вставь токен из npm
4. Нажми **"Add secret"**

### 2.2 Добавь CODECOV_TOKEN (опционально, но рекомендуется)

1. Зайди на: https://about.codecov.io/sign-up/
2. **Sign up with GitHub**
3. Авторизуй доступ к репозиториям
4. Нажми **"Add new repository"**
5. Найди `vitest-react-profiler`
6. Скопируй **Upload token**
7. Добавь в GitHub Secrets:
   - **Name**: `CODECOV_TOKEN`
   - **Secret**: вставь токен из Codecov

---

## Этап 3️⃣: Проверка Перед Релизом

### 3.1 Локальная проверка

Запусти все проверки локально:

```bash
# Убедись что находишься в директории проекта
cd /Users/olegivanov/WebstormProjects/vitest-react-profiler

# Проверка форматирования
npm run format -- --check

# Линтинг
npm run lint

# Проверка типов
npm run typecheck

# Тесты с coverage
npm run test:coverage

# Build
npm run build
```

Все должно пройти успешно ✅

### 3.2 Проверь package.json

```bash
cat package.json | grep -E '(name|version|description|author)'
```

Убедись что:

- ✅ `"name": "vitest-react-profiler"`
- ✅ `"version": "1.0.0"`
- ✅ `"description"` заполнено
- ✅ `"author"` указан

### 3.3 Проверь что имя пакета свободно

```bash
npm view vitest-react-profiler
```

Должно быть: `npm ERR! 404 'vitest-react-profiler@latest' is not in this registry.`

Если пакет уже существует - нужно выбрать другое имя!

### 3.4 Тестовая сборка пакета

```bash
# Создай пакет локально
npm pack

# Посмотри что попадет в пакет
tar -tzf vitest-react-profiler-1.0.0.tgz | head -20

# Проверь размер
ls -lh vitest-react-profiler-1.0.0.tgz

# Удали тестовый пакет
rm vitest-react-profiler-1.0.0.tgz
```

---

## Этап 4️⃣: Создание Релиза

### 4.1 Финальная проверка Git

```bash
# Убедись что все закоммичено
git status

# Должно быть чисто: "nothing to commit, working tree clean"

# Проверь последние коммиты
git log --oneline -5

# Убедись что на правильной ветке
git branch --show-current
# Должно быть: master
```

### 4.2 Создай Git Tag

```bash
# Создай аннотированный тег
git tag -a v1.0.0 -m "Release v1.0.0

Initial release of vitest-react-profiler

Features:
- withProfiler() HOC for component profiling
- 7 custom Vitest matchers
- 100% test coverage
- Full TypeScript support
- Comprehensive documentation
"

# Проверь что тег создан
git tag -l

# Посмотри информацию о теге
git show v1.0.0
```

### 4.3 Push тега на GitHub

```bash
# Push тег
git push origin v1.0.0
```

⚡ **ЭТО ЗАПУСТИТ АВТОМАТИЧЕСКИЙ РЕЛИЗ!**

GitHub Actions автоматически:

1. Запустит все тесты
2. Соберет пакет
3. Опубликует в npm (используя NPM_TOKEN)
4. Создаст GitHub Release

---

## Этап 5️⃣: Мониторинг Релиза

### 5.1 Следи за GitHub Actions

1. Открой: https://github.com/greydragon888/vitest-react-profiler/actions
2. Найди workflow **"Release"**
3. Кликни на него
4. Наблюдай за прогрессом

Должны пройти все шаги:

- ✅ Checkout repo
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Lint code
- ✅ Type check
- ✅ Run tests
- ✅ Build package
- ✅ Verify package
- ✅ Publish to NPM
- ✅ Create GitHub Release

### 5.2 Проверь публикацию на NPM

Подожди ~2-3 минуты после успешного workflow, затем:

```bash
# Проверь что пакет появился
npm view vitest-react-profiler

# Должна быть информация о пакете, включая:
# - version: 1.0.0
# - description
# - author
# - repository
```

### 5.3 Проверь GitHub Release

1. Открой: https://github.com/greydragon888/vitest-react-profiler/releases
2. Должен появиться **v1.0.0**
3. С автоматически сгенерированными release notes

---

## Этап 6️⃣: Проверка Установки

### 6.1 Создай тестовый проект

```bash
# Выйди из директории проекта
cd ~

# Создай временную директорию
mkdir test-vitest-react-profiler
cd test-vitest-react-profiler

# Инициализируй проект
npm init -y

# Установи твой пакет из npm
npm install vitest-react-profiler react react-dom vitest @testing-library/react
```

### 6.2 Тестовый файл

```bash
cat > test.mjs << 'EOF'
import { withProfiler } from 'vitest-react-profiler';

console.log('✅ Import successful!');
console.log('withProfiler:', typeof withProfiler);
console.log('Package installed correctly!');
EOF

node test.mjs
```

Должно вывести:

```
✅ Import successful!
withProfiler: function
Package installed correctly!
```

### 6.3 Очистка

```bash
# Удали тестовую директорию
cd ~
rm -rf test-vitest-react-profiler
```

---

## 🎉 Поздравляю с Первым Релизом!

Твой пакет теперь доступен для всех:

- 📦 **NPM**: https://www.npmjs.com/package/vitest-react-profiler
- 🐙 **GitHub**: https://github.com/greydragon888/vitest-react-profiler
- 📊 **Codecov**: https://app.codecov.io/gh/greydragon888/vitest-react-profiler

---

## 📢 Следующие Шаги (опционально)

### Расскажи о пакете

1. **Reddit**:
   - r/reactjs
   - r/javascript
   - r/typescript

2. **Twitter/X**: Твитни о релизе

3. **Dev.to**: Напиши статью

4. **Product Hunt**: Опубликуй продукт

### Добавь бейджи в README

Бейджи автоматически появятся после первых CI runs:

- ![CI](https://github.com/greydragon888/vitest-react-profiler/workflows/CI/badge.svg)
- ![Coverage](https://codecov.io/gh/greydragon888/vitest-react-profiler/branch/master/graph/badge.svg)
- ![npm version](https://img.shields.io/npm/v/vitest-react-profiler.svg)
- ![npm downloads](https://img.shields.io/npm/dm/vitest-react-profiler.svg)

---

## ❓ Troubleshooting

### Проблема: GitHub Actions не запустился

**Решение**: Проверь что:

1. Тег начинается с `v` (v1.0.0, не 1.0.0)
2. В `.github/workflows/release.yml` указан правильный trigger:
   ```yaml
   on:
     push:
       tags:
         - "v*"
   ```

### Проблема: Публикация в npm failed

**Причины**:

1. NPM_TOKEN не добавлен или неправильный
2. Имя пакета уже занято
3. 2FA не настроена на npm
4. Нет прав на публикацию (для scoped packages)

**Решение**:

1. Проверь GitHub Secrets
2. Проверь `npm view <package-name>`
3. Включи 2FA на npmjs.com
4. Для @username/package нужны дополнительные права

### Проблема: Тесты падают в CI

**Решение**:

```bash
# Запусти локально точно так же как в CI
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

---

## 📚 Полезные Ссылки

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Codecov Docs](https://docs.codecov.com/)

---

**Удачи с релизом! 🚀**
