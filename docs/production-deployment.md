# Production-деплой

Pipeline `.github/workflows/deploy.yml` запускается для каждого push в `main` и вручную через
workflow_dispatch. Два параллельных CI job выполняют `npm ci`, lint, format-check и build для
`server` и `web`. Только после обоих успешных job release копируется на сервер через rsync/SSH
и запускается `deploy/deploy.sh`.

Actions не хранит GitHub-токен на сервере. Он копирует ровно checkout проверенного commit.
Файл `.env.production` исключён из rsync и остаётся только на сервере. Одновременно выполняется
не более одного production workflow. Официальные `actions/checkout` и `actions/setup-node`
закреплены на полных commit SHA.

## Production Compose

`compose.prod.yaml` запускает шесть сервисов с production targets и постоянными volumes.
Только web публикует порт `127.0.0.1:8080`; API, служебный PostgreSQL и sample databases
доступны лишь внутри Compose-сети. Внешний Nginx завершает TLS. Приложение использует
passwordless email OTP; рабочие REST-маршруты защищены Bearer JWT и изолированы по владельцу.

Ориентир для одного сервера: Ubuntu 22.04/24.04, 4 CPU, 8 GB RAM и 20 GB свободного диска.
DNS A/AAAA запись домена должна указывать на сервер до запуска Certbot.

## 1. Установка на Ubuntu

Выполняйте от пользователя с sudo. Если официальный Docker Engine уже установлен, оставьте
только установку `rsync nginx certbot python3-certbot-nginx`.

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl rsync nginx certbot python3-certbot-nginx
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker nginx
docker --version
docker compose version
```

## 2. Пользователь деплоя и каталог

Сначала на своей локальной машине создайте отдельный ключ без passphrase:

```sh
ssh-keygen -t ed25519 -C database-enjoyer-actions -f ./database-enjoyer-deploy -N ''
cat ./database-enjoyer-deploy.pub
```

Скопируйте выведенный публичный ключ и выполните на сервере, заменив строку `ssh-ed25519 ...`:

```sh
sudo useradd --create-home --shell /bin/bash deployer
sudo usermod -aG docker deployer
sudo install -d -o deployer -g deployer -m 0700 /home/deployer/.ssh
echo 'ssh-ed25519 REPLACE_WITH_PUBLIC_KEY database-enjoyer-actions' | sudo tee /home/deployer/.ssh/authorized_keys >/dev/null
sudo chown deployer:deployer /home/deployer/.ssh/authorized_keys
sudo chmod 0600 /home/deployer/.ssh/authorized_keys
sudo install -d -o deployer -g deployer -m 0750 /opt/database-enjoyer
```

Если `deployer` уже существует, пропустите `useradd`. Новое членство в группе `docker`
применится к следующим SSH-сессиям.

## 3. Production env

Задайте настоящий домен и один раз выполните блок ниже. Повторная генерация после запуска
сломает расшифровку сохранённых подключений и не изменит пароли пользователей в старых volumes.

```sh
export APP_DOMAIN=db.example.com
read -rp 'Email первого владельца: ' AUTH_BOOTSTRAP_EMAIL
read -rsp 'Resend API key: ' RESEND_API_KEY
echo
read -rp 'Resend sender (DatabaseEnjoyer <login@example.com>): ' RESEND_FROM_EMAIL

METADATA_PASSWORD=$(openssl rand -hex 24)
ENCRYPTION_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_KEY=$(openssl rand -hex 32)
REFRESH_TOKEN_KEY=$(openssl rand -hex 32)
OTP_PEPPER=$(openssl rand -hex 32)
PG_ADMIN_PASSWORD=$(openssl rand -hex 24)
PG_READER_PASSWORD=$(openssl rand -hex 18)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
MYSQL_ADMIN_PASSWORD=$(openssl rand -hex 24)
MYSQL_READER_PASSWORD=$(openssl rand -hex 18)
MONGO_ROOT_PASSWORD=$(openssl rand -hex 24)
MONGO_ADMIN_PASSWORD=$(openssl rand -hex 24)
MONGO_READER_PASSWORD=$(openssl rand -hex 18)

sudo tee /opt/database-enjoyer/.env.production >/dev/null <<EOF
WEB_PORT=8080
CORS_ORIGIN=https://${APP_DOMAIN}
POSTGRES_USER=database_enjoyer
POSTGRES_PASSWORD=${METADATA_PASSWORD}
POSTGRES_DB=database_enjoyer
CONNECTION_ENCRYPTION_KEY=${ENCRYPTION_KEY}
AUTH_ACCESS_TOKEN_KEY=${ACCESS_TOKEN_KEY}
AUTH_REFRESH_TOKEN_KEY=${REFRESH_TOKEN_KEY}
AUTH_OTP_PEPPER=${OTP_PEPPER}
AUTH_ACCESS_TOKEN_TTL_HOURS=12
AUTH_REFRESH_TOKEN_TTL_HOURS=168
AUTH_BOOTSTRAP_EMAIL=${AUTH_BOOTSTRAP_EMAIL}
RESEND_API_KEY=${RESEND_API_KEY}
RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
TEST_POSTGRES_USER=demo
TEST_POSTGRES_PASSWORD=${PG_ADMIN_PASSWORD}
TEST_POSTGRES_DB=commerce
SAMPLE_POSTGRES_USER=enjoyer
SAMPLE_POSTGRES_PASSWORD=${PG_READER_PASSWORD}
TEST_MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
TEST_MYSQL_USER=demo
TEST_MYSQL_PASSWORD=${MYSQL_ADMIN_PASSWORD}
TEST_MYSQL_DB=commerce
SAMPLE_MYSQL_USER=enjoyer
SAMPLE_MYSQL_PASSWORD=${MYSQL_READER_PASSWORD}
TEST_MONGO_ROOT_USER=admin
TEST_MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
TEST_MONGO_USER=demo
TEST_MONGO_PASSWORD=${MONGO_ADMIN_PASSWORD}
TEST_MONGO_DB=commerce
SAMPLE_MONGO_USER=enjoyer
SAMPLE_MONGO_PASSWORD=${MONGO_READER_PASSWORD}
EOF

sudo chown deployer:deployer /opt/database-enjoyer/.env.production
sudo chmod 0600 /opt/database-enjoyer/.env.production
unset METADATA_PASSWORD ENCRYPTION_KEY ACCESS_TOKEN_KEY REFRESH_TOKEN_KEY OTP_PEPPER
unset AUTH_BOOTSTRAP_EMAIL RESEND_API_KEY RESEND_FROM_EMAIL PG_ADMIN_PASSWORD PG_READER_PASSWORD
unset MYSQL_ROOT_PASSWORD MYSQL_ADMIN_PASSWORD MYSQL_READER_PASSWORD
unset MONGO_ROOT_PASSWORD MONGO_ADMIN_PASSWORD MONGO_READER_PASSWORD
```

Реквизиты sample users для формы подключения находятся в этом env. Посмотреть их можно
командой `sudo grep '^SAMPLE_.*PASSWORD' /opt/database-enjoyer/.env.production`.
До первого запуска добавьте домен отправителя в Resend, подтвердите DNS и создайте API key.
`RESEND_FROM_EMAIL` должен использовать этот домен. `AUTH_BOOTSTRAP_EMAIL` после первого
успешного входа получает записи каталога, созданные до добавления авторизации.

## 4. Nginx и TLS

Nginx принимает публичный HTTPS-трафик и передаёт его web-контейнеру. Вход выполняется
в самом DatabaseEnjoyer по email.

```sh
export APP_DOMAIN=db.example.com

sudo tee /etc/nginx/sites-available/database-enjoyer >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_DOMAIN};
    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -sfn /etc/nginx/sites-available/database-enjoyer /etc/nginx/sites-enabled/database-enjoyer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d "$APP_DOMAIN" --redirect
sudo systemctl status certbot.timer --no-pager
```

Откройте в firewall входящие TCP 22, 80 и 443. Для UFW:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 5. GitHub Secrets

На локальной машине получите pinned host key сервера:

```sh
ssh-keyscan -H -p 22 YOUR_SERVER_IP
cat ./database-enjoyer-deploy
```

В GitHub откройте `Settings → Secrets and variables → Actions` и добавьте repository secrets:

| Secret | Значение |
| --- | --- |
| `DEPLOY_HOST` | IP или DNS сервера, доступный GitHub runner |
| `DEPLOY_PORT` | `22` или ваш SSH-порт |
| `DEPLOY_USER` | `deployer` |
| `DEPLOY_SSH_KEY` | Полное содержимое приватного `database-enjoyer-deploy` |
| `DEPLOY_KNOWN_HOSTS` | Полная строка из `ssh-keyscan` |

На вкладке **Variables** добавьте `DEPLOY_ENABLED=true`. До появления этой переменной push
запускает CI, но безопасно пропускает deploy job. Это позволяет опубликовать первый commit до
подготовки сервера и секретов.

После сохранения секрета удалите локальный приватный ключ либо перенесите его в защищённое
хранилище. Не добавляйте его в репозиторий.

## 6. Первый и последующие деплои

Push в `main` автоматически запустит workflow. Состояние видно во вкладке Actions. На сервере:

```sh
sudo -u deployer docker compose \
  --env-file /opt/database-enjoyer/.env.production \
  -f /opt/database-enjoyer/compose.prod.yaml ps

sudo -u deployer docker compose \
  --env-file /opt/database-enjoyer/.env.production \
  -f /opt/database-enjoyer/compose.prod.yaml logs --tail=100 server web

curl https://db.example.com/api/health
```

Для ручного повторного запуска используйте `Actions → CI and production deploy → Run workflow`.
Volumes не удаляются при обновлении. Не выполняйте `docker compose down -v` на production.
