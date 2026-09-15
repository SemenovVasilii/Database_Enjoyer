# Коннекторы

| Движок | Драйвер | Источник метаданных | Просмотр данных |
| --- | --- | --- | --- |
| PostgreSQL | pg | pg_namespace, pg_class, pg_attribute, pg_attrdef, pg_index, pg_constraint | SELECT из table/view/materialized_view |
| MySQL 8 | mysql2/promise | information_schema TABLES/COLUMNS/STATISTICS/TABLE_CONSTRAINTS/KEY_COLUMN_USAGE/REFERENTIAL_CONSTRAINTS/CHECK_CONSTRAINTS | SELECT из таблицы или представления |
| MongoDB | mongodb | listCollections, listIndexes, validator/options, выборка документов | find/skip/limit, сортировка по _id |

PostgreSQL читает каталог в REPEATABLE READ READ ONLY. Исключены pg_* и information_schema.
Сохраняются native data types, комментарии, defaults, PK/FK/unique/check и определения индексов.
Таблицы-партиции и родительские partitioned tables могут быть отдельными объектами.

MySQL ограничен выбранной базой, сохраняет порядок колонок, составные индексы, тип индекса,
EXTRA, FK и действия ON UPDATE/DELETE. Типы и информация о nullability представлений
соответствуют данным, возвращённым information_schema.

MongoDB — документная БД: строгой общей схемы коллекции может не быть. Выводится объединение
полей первых 200 документов по _id; обход глубиной до 5 уровней, до 20 элементов каждого
вложенного массива. Смешанные типы отображаются через `|`; пропуски/null — nullable.
Validator и native index options сохраняются отдельно. Поля за пределами выборки могут
не попасть в структуру. На вкладке данных видны верхнеуровневые поля документов;
вложенные значения отображаются как JSON. BSON сохраняет типы через canonical Extended JSON
(ObjectId, Decimal128, Int64, даты и binary не превращаются в неточные JS числа).

## Права и ограничения

Учебные пользователи имеют только права чтения своих sample databases. Синхронизация и
вкладка данных не выполняют запись или пользовательские pipeline. PostgreSQL включает
default_transaction_read_only; MySQL — session transaction read only. Серверные grants
остаются основной границей доступа.

Проверка соединения подтверждает авторизацию/доступность, но не гарантирует право читать
все объекты. Статус профиля описывает последнюю синхронизацию, не постоянную liveness-проверку.
Health относится к служебной БД, а не ко всем подключениям.

Страница 1–100 строк (web — 50), offset 0–100000; одна лишняя строка используется для hasMore.
Полный COUNT не выполняется. SQL сортирует по PK, если он есть; без PK порядок между
страницами не гарантирован. OFFSET и живые изменения БД могут сдвигать границы страниц.
MongoDB сортирует по _id. Параметры limit/offset валидируются; идентификаторы берутся из
активного каталога и экранируются отдельно от параметров значений.

Connection timeout 5 секунд; SQL statement/maxTimeMS — 10 секунд, клиентский timeout около
12–15 секунд. MongoDB ограничивает время обхода каталога примерно 90 секундами плюс текущая
операция. Каталог ограничен 100 namespaces, 1000 объектов и 50000 полей; превышение приводит
к failed sync с сохранением предыдущей версии. Синхронизация выполняется в HTTP-запросе.

TLS включается отдельно, с проверкой сертификата. Пользовательские CA, SSH-туннели,
SRV URI, replica-set настройки и редактирование сохранённых реквизитов — следующие расширения.
Текущая форма поддерживает одиночный host/port, database, username/password и authSource MongoDB.

## SQL workspace

Сохранённые PostgreSQL и MySQL профили могут открыть отдельную сессию для пользовательского
SQL. В ней нет принудительного read-only: доступные SELECT/DML/DDL определяются grants
учётной записи. Для учебных баз пользователь `enjoyer` оставлен read-only. Тайм-аут запроса
30 секунд, ответ ограничен 1000 строками на result set. PostgreSQL поддерживает batch,
MySQL запускает ровно одно выражение (`multipleStatements=false`). Драйвер пока получает
результат целиком перед обрезкой; для очень больших выборок следующим шагом нужны cursor/
streaming и отмена серверной сессии. После DDL каталог обновляется только явной синхронизацией.

Источники: [pg queries](https://node-postgres.com/features/queries),
[mysql2](https://sidorares.github.io/node-mysql2/docs),
[MongoClient](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/).
