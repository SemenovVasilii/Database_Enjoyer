-- Passwordless email authentication and per-user ownership.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (email);

CREATE TABLE auth_email_codes (
  email varchar(320) PRIMARY KEY,
  code_digest bytea NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT auth_email_codes_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE INDEX auth_email_codes_expires_at_idx ON auth_email_codes (expires_at);

ALTER TABLE connections
  ADD COLUMN owner_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE databases
  ADD COLUMN owner_id uuid REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX connections_owner_created_idx ON connections (owner_id, created_at DESC);
CREATE INDEX databases_owner_imported_idx ON databases (owner_id, imported_at DESC);

COMMENT ON COLUMN connections.owner_id IS
  'NULL only for profiles created before authentication; AUTH_BOOTSTRAP_EMAIL may claim them once.';
COMMENT ON COLUMN databases.owner_id IS
  'NULL only for snapshots created before authentication; AUTH_BOOTSTRAP_EMAIL may claim them once.';
