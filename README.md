# DatabaseEnjoyer

[![CI and production deploy](https://github.com/SemenovVasilii/Database_Enjoyer/actions/workflows/deploy.yml/badge.svg)](https://github.com/SemenovVasilii/Database_Enjoyer/actions/workflows/deploy.yml)

Рабочее пространство для подключения к PostgreSQL, MySQL и MongoDB, исследования структуры,
просмотра данных и выполнения SQL в PostgreSQL/MySQL. JSON-снимки поддерживаются как
дополнительный офлайн-сценарий.

Два независимых приложения: `web` (React, TypeScript, TanStack Router, Tailwind, RTK Query, FSD)
и `server` (NestJS, TypeScript, нативные драйверы, SQL без ORM). Основной `compose.yaml` запускает только приложения и PostgreSQL каталога. Учебные
PostgreSQL, MySQL и MongoDB запускаются отдельно через `compose.samples.yaml`.

## Быстрый старт

```sh
cp .env.example .env
docker compose -f compose.samples.yaml up -d
docker compose up -d --build
npm --prefix server run samples:load
```

На пустых volumes учебные базы загружаются автоматически. Последняя команда нужна
для volumes, созданных раньше; существующие базы примеров она не перезаписывает.

Откройте http://localhost:5173, войдите по email и возьмите локальный код из
`docker compose logs server`. Затем нажмите **Подключить базу** → выберите движок →
**Подставить адрес и пользователя** → введите пароль из [реквизитов](docs/test-databases.md) →
**Проверить** → **Подключить**. Откройте объект и вкладку **Данные** либо перейдите в
**SQL-редактор**, выберите подключение и выполните запрос.
Светлая, тёмная и системная темы выбираются в верхней панели.

- Web: http://localhost:5173
- Health: http://localhost:3000/api/health

`server` публикует API только на loopback-интерфейсе. В production его порт вовсе не
публикуется: web проксирует запросы к `/api` внутри Docker-сети, а Swagger отключён.

## Документация

- [Оглавление](docs/README.md)
- [Развёртывание и переменные окружения](docs/deployment.md)
- [Авторизация по email](docs/authentication.md)
- [Production-сервер и GitHub Actions](docs/production-deployment.md)
- [Тестовые БД: адреса, пароли, дампы](docs/test-databases.md)
- [Архитектура приложений](docs/architecture.md)
- [Модель хранения метаданных](docs/data-model.md)
- [Коннекторы и особенности движков](docs/connectors.md)
- [REST API](docs/api.md)
- [SQL-редактор](docs/sql-editor.md)
- [Участие в разработке](docs/contributing.md)
- [Тема интерфейса](docs/theming.md)

Тесты пока не добавлены по условиям проекта. Проверки: `npm run build`, `npm run lint`,
`npm run format:check` отдельно в `web` и `server`.
