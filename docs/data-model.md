# Модель служебной БД

Служебный PostgreSQL — сервис `db`, база `verdant` (имя сохранено от первой версии,
чтобы использовать прежний volume). Миграция `003-connections.sql` добавляет каталог
подключений; `004-email-auth.sql` добавляет пользователей, коды входа и владельцев.
Старые JSON-снимки не удаляются.

## Таблицы

| Таблица | Содержимое и ключи |
| --- | --- |
| `users` | UUID пользователя, нормализованный уникальный email, created_at и last_login_at |
| `auth_email_codes` | Email, SHA-256 digest одноразового кода, число попыток, sent_at и expires_at; успешный код удаляется |
| `connections` | UUID профиля, owner_id, название, движок, host/port, database_name, username, auth_database, tls, description, active_sync_id, last_checked_at, last_error, даты создания/изменения |
| `connection_secrets` | Одна запись на connection_id: пароль в AES-256-GCM ciphertext, 12-байтовый nonce, 16-байтовый auth_tag, key_version, updated_at |
| `metadata_syncs` | UUID попытки, connection_id, running/success/failed, started_at/completed_at, server_version, безопасная ошибка, количества схем/объектов/полей |
| `metadata_namespaces` | UUID, sync_id, имя схемы PostgreSQL либо базы MySQL/MongoDB; UNIQUE(sync_id,name) |
| `metadata_objects` | UUID, namespace_id, имя, kind (table/view/materialized_view/collection), comment, extra; UNIQUE(namespace_id,name) |
| `metadata_columns` | UUID, object_id, имя, ordinal, data_type, nullable, primary_key, default_value, comment, extra; уникальны имя и ordinal внутри объекта |
| `metadata_indexes` | UUID, object_id, имя, unique/primary, упорядоченные columns, definition, extra |
| `metadata_constraints` | UUID, object_id, имя, kind, columns, definition, referenced_namespace/object/columns, extra |
| `databases` | Прежний дополнительный офлайн-каталог: owner_id, имя, движок, description, JSONB schemas, счётчики и imported_at. Не хранит реквизитов и не используется коннекторами |
| `schema_migrations` | Имя применённой SQL-миграции и applied_at |

Владелец связан как `users → connections` и `users → databases` с ON DELETE CASCADE.
Каталог связан как `connections → metadata_syncs → metadata_namespaces → metadata_objects →
metadata_columns / metadata_indexes / metadata_constraints`. Секрет связан напрямую
с профилем. Все дочерние записи имеют FK с ON DELETE CASCADE.

`connections.active_sync_id` вместе с `connections.id` ссылается на пару
`metadata_syncs(connection_id,id)`: нельзя назначить профилю каталог другого подключения.
Этот FK отложенный, чтобы каскадное удаление профиля корректно удаляло его версии.
Для running существует частичный уникальный индекс: одновременно один sync на профиль.

## Синхронизация и публикация

1. Создаётся попытка `running`, затем сервер читает каталог внешней БД.
2. Нормализованные namespaces/objects/columns/indexes/constraints записываются в одной
   транзакции. На время публикации блокируются профиль и попытка.
3. В той же транзакции попытка становится `success`, заполняются счётчики и версия
   сервера, указатель active_sync_id переводится на новую версию, last_error очищается.
4. При ошибке транзакция откатывается, попытка становится `failed`, сохраняется безопасная
   ошибка. active_sync_id остаётся прежним: частичная структура никогда не публикуется.

История успешных версий сохраняется полностью; API истории возвращает последние 20
попыток. Автоматическое удаление старых версий пока не реализовано. В больших каталогах
нужно определить политику хранения перед длительной эксплуатацией.
Прерванная running-попытка старше 5 минут переводится в failed при следующем обновлении
этого профиля. Фонового планировщика нет.

UUID объекта относится к конкретной версии каталога. После обновления структуры клиент
получает новые UUID; запрос со старым objectId возвращает 404. Для сравнения версий
естественная идентичность — connection_id + namespace + object name + kind.
FK внешней базы хранят ссылки по именам: целевой объект может быть недоступен пользователю,
а связывать ограничения между разными версиями каталога было бы ошибкой.

## Что находится в JSONB

JSONB здесь — для переменной структуры, не вместо реляционных связей:
упорядоченные списки ключей индексов и ограничений, BSON validator, параметры коллекции,
MongoDB index options, PostgreSQL identity/generated, MySQL EXTRA и действия FK.
Типы и свойства обычных SQL-колонок находятся в отдельных колонках таблицы metadata_columns.

Для MongoDB namespace — имя БД, объект — коллекция. Поля, включая вложенные пути и пути
в массивах, выводятся из выборки максимум 200 документов. В extra сохраняются sampleSize,
sampleLimit, schemaInferred, присутствие поля и требования validator. nullable означает
отсутствие или null в выборке, а не объявленную сервером SQL-схему.

## Секреты и данные строк

Ключ CONNECTION_ENCRYPTION_KEY (32 байта, hex) находится в окружении сервера, не в БД.
Каждое шифрование получает случайный nonce; UUID подключения используется как AAD,
поэтому ciphertext нельзя перенести на другой профиль без ошибки проверки целостности.
Пароли не возвращаются REST API и не пишутся в ошибки или историю синхронизации.
key_version=1 зарезервирован под будущую миграцию ключей; автоматической ротации нет.
Смена ключа без перешифрования сделает существующие секреты нечитаемыми.

Строки таблиц, документы коллекций, результаты чтения и пароли в открытом виде
**не сохраняются** в служебном PostgreSQL. Удаление профиля удаляет только локальный
профиль, секрет и каталог; подключённая база не изменяется.

SQL workspace также не добавляет таблиц истории: текст запроса, время и result sets живут
только в текущем состоянии web-клиента. Черновик SQL хранится в localStorage браузера по
ключу connectionId и не содержит реквизитов подключения.

## Данные авторизации

Открытый OTP не записывается: сервер сохраняет digest из нормализованного email, кода и
`AUTH_OTP_PEPPER`. Коды действуют 10 минут, заменяются при повторной отправке и блокируются
после пяти неверных попыток. Access/refresh JWT не сохраняются в PostgreSQL. Поэтому удаление
пользователя прекращает доступ при следующей проверке guard, но точечный отзыв токена без
удаления пользователя пока невозможен.

`owner_id IS NULL` допустим только для записей, созданных до миграции. Вход email из
`AUTH_BOOTSTRAP_EMAIL` назначает такие записи этому пользователю. Все новые подключения и
снимки всегда создаются с владельцем; API никогда не возвращает записи с NULL другому аккаунту.
