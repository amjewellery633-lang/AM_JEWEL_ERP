-- Add missing metal types to the enum
-- Note: In PostgreSQL, you can add new values to an enum using ALTER TYPE ... ADD VALUE

-- Add gold_916 to metal_type_enum if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TYPE metal_type_enum ADD VALUE IF NOT EXISTS 'gold_916';
  EXCEPTION
    WHEN duplicate_object THEN
      -- Value already exists, do nothing
      NULL;
  END;
END
$$;

-- Add gold_750 to metal_type_enum if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TYPE metal_type_enum ADD VALUE IF NOT EXISTS 'gold_750';
  EXCEPTION
    WHEN duplicate_object THEN
      -- Value already exists, do nothing
      NULL;
  END;
END
$$;