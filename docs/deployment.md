# Развёртывание для разработки

## Два Compose-стека

`compose.yaml` запускает только DatabaseEnjoyer: web, server и PostgreSQL каталога метаданных.
Учебные PostgreSQL, MySQL и MongoDB вынесены в независимый каталог
`../database-enjoyer-test-databases`. Их можно
останавливать, пересоздавать и обновлять без влияния на пользователей и каталог приложения.

```sh
cp .env.example .env
docker compose -f ../database-enjoyer-test-databases/compose.yaml up -d
docker compose up -d --build
```

Откройте `http://localhost:5173`. Код входа при пустых Resend-переменных выводится командой
`docker compose logs server`.

Основной стек публикует web на `127.0.0.1:5173`, API на `127.0.0.1:3000` только для локальной
разработки и metadata PostgreSQL на `127.0.0.1:5432`. Swagger отключён.

## Учебные базы

`../database-enjoyer-test-databases/compose.yaml` открывает порты только на loopback-интерфейсе:

| СУБД | Адрес с хоста | Адрес из server Docker | Учебная БД |
| --- | --- | --- | --- |
| PostgreSQL | `localhost:5433` | `host.docker.internal:5433` | `pagila` |
| MySQL | `localhost:3307` | `host.docker.internal:3307` | `sakila` |
| MongoDB | `localhost:27018` | `host.docker.internal:27018` | `restaurants` |

Реквизиты описаны в [test-databases.md](test-databases.md). Они создаются только на пустых
volumes; изменение `SAMPLE_*_PASSWORD` в `.env` не меняет существующих пользователей.

## Переменные окружения

| Файл | Назначение |
| --- | --- |
| `.env.example` → `.env` | Локальный app и metadata PostgreSQL |
| `server/.env.example` → `server/.env` | Независимый Nest без Docker |
| `web/.env.example` → `web/.env` | Независимый Vite |
| `.env.production.example` | Только production app и metadata catalog |

`CONNECTION_ENCRYPTION_KEY` — 64 hex-символа. Не меняйте его после сохранения подключений:
он нужен для расшифровки секретов. Access JWT, refresh JWT и OTP pepper должны быть разными
секретами длиной не менее 32 символов.

## Резервные копии

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > metadata-backup.sql
```

Бэкап содержит каталог и зашифрованные секреты. Для восстановления требуется прежний
`CONNECTION_ENCRYPTION_KEY`.

## Полезные команды

```sh
docker compose ps
docker compose -f ../database-enjoyer-test-databases/compose.yaml ps
docker compose -f ../database-enjoyer-test-databases/compose.yaml down
```

`docker compose down -v` удаляет каталог метаданных. Для обычных обновлений его не используйте.
