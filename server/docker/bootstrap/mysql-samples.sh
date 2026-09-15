#!/bin/sh
set -eu
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
if [ "$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='sakila'")" = 0 ]; then
  mysql -u root < /samples/sakila/schema.sql
  mysql -u root < /samples/sakila/data.sql
else
  echo 'sakila exists; keeping its data. Schema/data are not overwritten.'
fi
# Quote values as hex SQL strings, including configurable names/passwords.
user_hex=$(printf %s "${SAMPLE_MYSQL_USER:-enjoyer}" | od -An -v -tx1 | tr -d ' \n')
password_hex=$(printf %s "${SAMPLE_MYSQL_PASSWORD:-enjoyer_mysql}" | od -An -v -tx1 | tr -d ' \n')
mysql -u root <<SQL
SET @sample_user=CONVERT(0x${user_hex} USING utf8mb4), @sample_password=CONVERT(0x${password_hex} USING utf8mb4);
SET @sql=CONCAT('CREATE USER IF NOT EXISTS ',QUOTE(@sample_user),'@\'%\' IDENTIFIED BY ',QUOTE(@sample_password));
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;
SET @sql=CONCAT('GRANT SELECT, SHOW VIEW ON sakila.* TO ',QUOTE(@sample_user),'@\'%\'');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;
SQL
