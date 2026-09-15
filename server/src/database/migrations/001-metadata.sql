-- Preserve the existing catalog when updating the scaffold.
CREATE TABLE IF NOT EXISTS databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  engine varchar(20) NOT NULL CHECK (engine IN ('postgresql', 'mysql', 'sqlite', 'mssql', 'other')),
  description varchar(2000) NOT NULL DEFAULT '',
  schemas jsonb NOT NULL CHECK (jsonb_typeof(schemas) = 'array'),
  schema_count integer NOT NULL CHECK (schema_count >= 0),
  table_count integer NOT NULL CHECK (table_count >= 0),
  column_count integer NOT NULL CHECK (column_count >= 0),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS databases_imported_at_idx ON databases (imported_at DESC);
