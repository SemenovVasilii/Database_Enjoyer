ALTER TABLE databases DROP CONSTRAINT IF EXISTS databases_engine_check;
ALTER TABLE databases ADD CONSTRAINT databases_engine_check
  CHECK (engine IN ('postgresql', 'mysql', 'mongodb', 'sqlite', 'mssql', 'other'));
