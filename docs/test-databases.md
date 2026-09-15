# Тестовые базы и реквизиты

## Подключение из web при запуске всего стека через Compose

Откройте «Подключить базу», выберите движок и нажмите «Подставить адрес и пользователя».
Введите пароль из таблицы. TLS для локальных контейнеров выключен.

| Поле | PostgreSQL | MySQL | MongoDB |
| --- | --- | --- | --- |
| Host | test-postgres | test-mysql | test-mongo |
| Port | 5432 | 3306 | 27017 |
| Database | pagila | sakila | restaurants |
| Username | enjoyer | enjoyer | enjoyer |
| Password | enjoyer_postgres | enjoyer_mysql | enjoyer_mongo |
| Auth database / authSource | — | — | restaurants |

Это отдельные пользователи для чтения, а не администраторы. Настройки находятся в корневом
.env.example: SAMPLE_*_USER/PASSWORD, SAMPLE_*_DB/HOST/INTERNAL_PORT.
Если bootstrap выполнялся с другими значениями, используйте значения вашего .env.
Форма позволяет изменять все поля.

## Если server работает на хосте через npm

Host=localhost, порт PostgreSQL=5433, MySQL=3307, MongoDB=27018.
Остальные поля те же. Для server в Docker и БД на хосте используйте host.docker.internal
с портом хоста. Браузер общается с REST; соединяется с целевой БД именно server.

## Наборы данных

| БД | Источник | Что исследовать |
| --- | --- | --- |
| Pagila | [PostgreSQL sample database, tag pagila-v3.1.0](https://github.com/devrimgunduz/pagila/tree/pagila-v3.1.0) | actor, film, film_actor, customer, rental, payment и партиции; PK/FK/check, enum, views, defaults |
| Sakila 1.5 | [Официальный дамп MySQL](https://downloads.mysql.com/docs/sakila-db.tar.gz), [описание](https://dev.mysql.com/doc/sakila/en/) | Видеопрокат: actor/film/customer/rental/payment, составные ключи, views, индексы |
| Restaurants | [Учебный JSONL MongoDB](https://raw.githubusercontent.com/mongodb/docs-assets/primer-dataset/primer-dataset.json) | 25 359 документов, name/borough/cuisine/address/grades; вложенные объекты, массивы, даты, геоиндекс |

Оригинальные дампы и лицензии лежат в server/docker/samples. manifest.json содержит версии,
источники и SHA-256. SQL-дампы не скачиваются при обычном старте: они уже в проекте.
Pagila schema адаптирована только удалением ALTER ... OWNER TO postgres; оригинал сохранён
рядом. Из Sakila schema удалён DROP SCHEMA, оригинал тоже сохранён. MongoDB setup.js добавляет собственный validator и индексы borough_cuisine,
restaurant_id, address_geo. Индекс _id создаётся MongoDB автоматически.

Существующая commerce на каждом тестовом сервере сохранена отдельно. Старые demo-пользователи
и администраторы описаны в .env.example: PostgreSQL demo/demo_postgres, MySQL demo/demo_mysql
(root demo_mysql_root), MongoDB demo/demo_mongo в authSource=commerce
(admin/demo_mongo_root в authSource=admin). Они предназначены для bootstrap/старых fixtures.

## Загрузка и повторный запуск

На пустых volumes официальные entrypoint запускают 001-fixtures и 002-samples.
При обновлении existing volumes:

```sh
npm --prefix server run samples:load
```

Скрипт вызывает три штатных CLI внутри Compose. Для Docker context отличный от default:

```sh
DOCKER_CONTEXT=desktop-linux npm --prefix server run samples:load
```

Существующие pagila/sakila и коллекция restaurants не перезаписываются. Пользователи создаются,
если отсутствуют; повторный запуск не меняет их пароли. Индексы MongoDB идемпотентны.
Скрипт не выполняет DROP существующих пользовательских баз. Для сознательной перезагрузки
примеров нужна отдельная ручная процедура; не используйте down -v для обычного обновления.
