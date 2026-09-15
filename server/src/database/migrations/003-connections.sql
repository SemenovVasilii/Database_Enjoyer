-- Profiles and secrets are separate; immutable sync versions own the normalized catalog.
CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  engine varchar(20) NOT NULL CHECK (engine IN ('postgresql','mysql','mongodb')),
  host varchar(253) NOT NULL,
  port integer NOT NULL CHECK (port BETWEEN 1 AND 65535),
  database_name varchar(120) NOT NULL,
  username varchar(120) NOT NULL,
  auth_database varchar(120),
  tls boolean NOT NULL DEFAULT false,
  description varchar(2000) NOT NULL DEFAULT '',
  active_sync_id uuid,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE connection_secrets (
  connection_id uuid PRIMARY KEY REFERENCES connections(id) ON DELETE CASCADE,
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL CHECK (octet_length(nonce) = 12),
  auth_tag bytea NOT NULL CHECK (octet_length(auth_tag) = 16),
  key_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE metadata_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  status varchar(12) NOT NULL CHECK (status IN ('running','success','failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  server_version text,
  error_message text,
  schema_count integer NOT NULL DEFAULT 0,
  object_count integer NOT NULL DEFAULT 0,
  column_count integer NOT NULL DEFAULT 0,
  UNIQUE (connection_id, id)
);
ALTER TABLE connections ADD CONSTRAINT connections_active_sync_fk
  FOREIGN KEY (id, active_sync_id) REFERENCES metadata_syncs(connection_id, id) DEFERRABLE INITIALLY DEFERRED;
CREATE UNIQUE INDEX metadata_syncs_running_idx ON metadata_syncs(connection_id) WHERE status = 'running';
CREATE INDEX metadata_syncs_history_idx ON metadata_syncs(connection_id, started_at DESC);
CREATE TABLE metadata_namespaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id uuid NOT NULL REFERENCES metadata_syncs(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE (sync_id, name)
);
CREATE TABLE metadata_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id uuid NOT NULL REFERENCES metadata_namespaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind varchar(24) NOT NULL CHECK (kind IN ('table','view','materialized_view','collection')),
  comment text,
  extra jsonb NOT NULL DEFAULT '{}',
  UNIQUE (namespace_id, name)
);
CREATE TABLE metadata_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES metadata_objects(id) ON DELETE CASCADE,
  name text NOT NULL,
  ordinal integer NOT NULL,
  data_type text NOT NULL,
  nullable boolean NOT NULL,
  primary_key boolean NOT NULL DEFAULT false,
  default_value text,
  comment text,
  extra jsonb NOT NULL DEFAULT '{}',
  UNIQUE (object_id, name), UNIQUE (object_id, ordinal)
);
CREATE TABLE metadata_indexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES metadata_objects(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_unique boolean NOT NULL,
  is_primary boolean NOT NULL,
  columns jsonb NOT NULL CHECK (jsonb_typeof(columns) = 'array'),
  definition text,
  extra jsonb NOT NULL DEFAULT '{}',
  UNIQUE (object_id, name)
);
CREATE TABLE metadata_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES metadata_objects(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  columns jsonb NOT NULL CHECK (jsonb_typeof(columns) = 'array'),
  definition text,
  referenced_namespace text,
  referenced_object text,
  referenced_columns jsonb NOT NULL DEFAULT '[]',
  extra jsonb NOT NULL DEFAULT '{}',
  UNIQUE (object_id, name)
);
CREATE INDEX metadata_objects_namespace_idx ON metadata_objects(namespace_id);
CREATE INDEX metadata_columns_object_idx ON metadata_columns(object_id);
CREATE INDEX metadata_indexes_object_idx ON metadata_indexes(object_id);
CREATE INDEX metadata_constraints_object_idx ON metadata_constraints(object_id);
