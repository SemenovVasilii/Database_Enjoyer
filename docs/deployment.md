# Развёртывание

## Docker Compose

```sh
cp .env.example .env
docker compose up -d --build
npm --prefix server run samples:load
docker compose ps
```

Доступ: web localhost:5173, REST localhost:3000/api, Swagger localhost:3000/api/docs.
Шесть сервисов: два приложения, PostgreSQL метаданных и три тестовых сервера.
name Compose-проекта `verdant` сохранено ради прежних volumes. Приложение называется DatabaseEnjoyer.
Откройте web, введите email и возьмите локальный OTP из `docker compose logs server`.

Nest работает в watch, Vite — с HMR. Изменение src подключено bind mounts; web/public тоже.
После изменения зависимостей, index.html или конфигураций пересоберите соответствующий сервис:

```sh
docker compose up -d --build --no-deps web
docker compose up -d --build --no-deps server
```

Если watcher не увидел изменение файла, перезапустите сервис. Миграции применяются при старте
server. Для existing volumes новые sample databases загружаются командой samples:load;
на пустых volumes bootstrap выполняется entrypoint автоматически. Сам PostgreSQL каталога
не ждёт учебные базы: к ним подключаются по запросу пользователя.

## Env

| Файл | Назначение |
| --- | --- |
| Корневой .env.example → .env | Общий Compose, БД, sample users, шифрование, JWT, OTP и Resend |
| server/.env.example → server/.env | Независимый Nest: DATABASE_URL, CORS, шифрование, email auth и Resend |
| web/.env.example → web/.env | Независимый Vite: VITE_API_URL и API_PROXY_TARGET |

В Compose server получает DATABASE_URL с host=db; внутри контейнеров приложения не
используют server/.env. Root .env и server/.env — разные настройки разных режимов запуска.
CONNECTION_ENCRYPTION_KEY должен содержать 64 hex символа. Для окружения кроме локальной
разработки создайте собственный ключ:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Сохраните ключ и резервную копию вместе с секретами развёртывания. Не меняйте его у уже
сохранённых профилей без перешифрования connection_secrets. В .env.example находится
открытый ключ только для локальной разработки. Не коммитьте .env.

Также создайте три независимых секрета для access JWT, refresh JWT и digest OTP. Каждый должен
содержать минимум 32 символа. В development пустые RESEND-переменные включают вывод кода в
лог; в production настройте API key и отправителя подтверждённого домена. Полное описание —
[authentication.md](authentication.md).

Порты и креды тестовых серверов — [test-databases.md](test-databases.md).
Изменение env пароля не меняет пользователя в существующем volume: bootstrap не ротирует
реквизиты. Названия sample databases сейчас фиксированы скриптами (pagila/sakila/restaurants);
SAMPLE_*_DB/HOST/INTERNAL_PORT в env.example служат справкой для формы подключения.
SAMPLE_*_USER/PASSWORD управляют созданием пользователей при bootstrap.

## Независимый запуск

Node.js 24+ и npm. Запустите базы:

```sh
docker compose up -d db test-postgres test-mysql test-mongo
npm --prefix server run samples:load
```

В server: cp .env.example .env, npm install, npm run dev.
В web: cp .env.example .env, npm install, npm run dev.
DATABASE_URL у server указывает на localhost:5432. В форме для учебных БД используйте
localhost и порты хоста (5433/3307/27018), а не имена Compose-сервисов.

По умолчанию web обращается к /api через Vite proxy. При прямом API задайте
VITE_API_URL=http://localhost:3000/api и соответствующий CORS_ORIGIN server.
Если server в Docker, а целевая БД на хосте, используйте host.docker.internal.

## Хранение и резервные копии

docker compose down сохраняет volumes. down -v удаляет все данные; для обновления его
не используйте. Volume служебной БД — verdant_postgres_data; тестовые данные — отдельные volumes.
Резервная копия каталога:

```sh
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > metadata-backup.sql
```

В копии находятся зашифрованные секреты; для восстановления нужен прежний ключ шифрования.
Дампы внешних БД в резервную копию каталога не входят.

## Production target

Dockerfile каждого приложения имеет production target. Web отдаёт статическую сборку через
Nginx (upstream server:3000); server — node dist/main.js, без dev-зависимостей, под non-root.
Production Compose использует passwordless email auth и изолирует каталог по owner_id.
RBAC и запрет отдельных сетевых диапазонов для подключений пока не реализованы. Порты
инфраструктуры привязаны к 127.0.0.1 или доступны только внутри Compose-сети.

Готовый production Compose, SSH pipeline и первичная настройка Ubuntu описаны в
[production-deployment.md](production-deployment.md). Pipeline запускается после push в
`main`, выполняет build/lint/format-check для `web` и `server`, затем передаёт release на
сервер и ждёт healthy-состояния всех контейнеров.

## Диагностика

- Проверяйте docker compose logs server и /api/health при ошибке каталога.
- «База не найдена»: выполните samples:load и проверьте databaseName.
- «Ошибка авторизации»: сверяйте SAMPLE_*_PASSWORD и authSource MongoDB.
- «Недоступна»: проверяйте, какой адрес доступен именно server, а не браузеру.
- Ошибка sync не удаляет старую структуру: исправьте реквизиты/доступ и обновите структуру.
