# REST API

Base URL `/api`. JSON; валидация отклоняет неизвестные поля и неверные UUID/порты/лимиты.
Swagger в приложении отключён. В production у server нет опубликованного порта: запросы к
`/api` приходят через web внутри Docker-сети. Секреты присутствуют только в теле POST запроса,
никогда в GET ответах. Кроме health и `/auth/*`, маршруты требуют
`Authorization: Bearer <accessToken>`.

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| GET | /health | Состояние приложения и PostgreSQL каталога |
| POST | /auth/otp/send | Отправить шестизначный код на email |
| POST | /auth/otp/verify | Проверить код, создать пользователя и получить пару JWT |
| POST | /auth/refresh | Обновить пару JWT по refresh token |
| GET | /auth/me | Текущий пользователь |
| GET | /databases | Общий каталог подключений и офлайн-снимков |
| GET | /databases/:id | Структура подключения или JSON-снимка |
| POST | /databases | Дополнительный импорт JSON-снимка, до 5 MB |
| DELETE | /databases/:id | Удалить локальный элемент каталога |
| GET | /connections | Только сохранённые подключения |
| POST | /connections/test | Проверить реквизиты без сохранения, 200 |
| POST | /connections | Сохранить профиль и загрузить структуру, 201 |
| GET | /connections/:id | Активная структура и состояние подключения |
| POST | /connections/:id/sync | Синхронизировать структуру, 200 |
| GET | /connections/:id/syncs | Последние 20 попыток, без паролей |
| GET | /connections/:id/objects/:objectId/rows?offset=0&limit=50 | Страница живых данных |
| POST | /connections/:id/query | Выполнить SQL в PostgreSQL или MySQL |
| DELETE | /connections/:id | Удалить профиль, секрет и локальные версии, 204 |

## Вход по email

```http
POST /api/auth/otp/send HTTP/1.1
Content-Type: application/json

{ "email": "you@example.com" }
```

```http
POST /api/auth/otp/verify HTTP/1.1
Content-Type: application/json

{ "email": "you@example.com", "code": "123456" }
```

Успешный ответ verify/refresh: `{ "accessToken": "...", "refreshToken": "..." }`.
Код действует 10 минут и допускает пять неверных попыток; повторная отправка — не чаще раза
в минуту. Первый успешный вход автоматически создаёт пользователя. 401 означает неверный
код или токен, 410 — истёкший код, 429 — ранний повтор либо исчерпанные попытки.

## Создание профиля

Для сервера внутри Compose:

```json
{
  "name": "PostgreSQL · Pagila",
  "engine": "postgresql",
  "host": "host.docker.internal",
  "port": 5433,
  "databaseName": "pagila",
  "username": "enjoyer",
  "password": "enjoyer_postgres",
  "tls": false
}
```

Для MySQL: engine=mysql, host=host.docker.internal, port=3307, databaseName=sakila,
password=enjoyer_mysql. Для MongoDB: engine=mongodb, host=host.docker.internal, port=27018,
databaseName=restaurants, authDatabase=restaurants, password=enjoyer_mongo.
name обязателен; description/authDatabase/tls необязательны. Пароль не обрезается trim.

Ответ — DatabaseDetails: id/name/engine/source/status/host/port/databaseName/lastError,
importedAt (дата активной структуры или создания), счётчики, schemas[].tables[] с UUID объектов.
source=connection или snapshot; status=ready/error/pending. При error после создания профиль
уже сохранён, можно вызвать sync. При неуспешной проверке профиль не создаётся.

## Страница данных

```json
{
  "columns": ["actor_id", "first_name", "last_name", "last_update"],
  "rows": [{ "actor_id": 1, "first_name": "PENELOPE", "last_name": "GUINESS", "last_update": "..." }],
  "offset": 0,
  "limit": 50,
  "hasMore": true,
  "orderedBy": ["actor_id"]
}
```

100 строк максимум; hasMore показывает наличие следующей строки, не точное количество.
Для MongoDB rows содержит Extended JSON. objectId принадлежит текущей версии этого профиля;
чужой или устаревший UUID возвращает 404. JSON-снимки не имеют live rows endpoint.

## Выполнение SQL

```json
{
  "sql": "SELECT actor_id, first_name FROM actor ORDER BY actor_id",
  "maxRows": 500
}
```

`sql` обязателен, не более 100 000 символов. `maxRows` — от 1 до 1000, по умолчанию 500.
Ответ содержит время и один или несколько наборов результата:

```json
{
  "durationMs": 2.4,
  "results": [{
    "command": "SELECT",
    "rowCount": 200,
    "columns": [{ "name": "actor_id", "dataType": "3" }],
    "rows": [[1], [2]],
    "truncated": true
  }]
}
```

Строки представлены массивами, а не объектами: так сохраняются повторяющиеся названия
колонок (`SELECT a.id, b.id`). PostgreSQL может вернуть несколько result sets для batch;
MySQL принимает одно выражение, поскольку `multipleStatements` отключён. 422 возвращается
для ошибки SQL, неподдерживаемой MongoDB либо нарушения прав. В ответе остаётся код БД,
а сырой текст драйвера заменяется безопасным сообщением. Текст запроса и результат не
записываются сервером в каталог.

400 — валидация; 404 — элемент/объект не найден; 409 — sync уже идёт; 422 — ошибка SQL;
502 — внешний сервер недоступен, ошибочная авторизация или не удалось прочитать каталог.
Ошибки драйвера преобразуются в безопасный текст без DSN, паролей и внутреннего SQL.
