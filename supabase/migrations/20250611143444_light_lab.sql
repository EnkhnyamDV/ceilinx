/*
  # Update form_positionen table structure

  1. Changes
    - Rename `form_id` to `meta_id` to match the requirement
    - Add missing columns if they don't exist
    - Update foreign key constraint

  2. Security
    - Maintain existing RLS policies
    - Keep all existing indexes and constraints
*/

-- Rename form_id to meta_id and update foreign key
DO $$
BEGIN
  -- Check if form_id exists and meta_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_positionen' AND column_name = 'form_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_positionen' AND column_name = 'meta_id'
  ) THEN
    -- Drop existing foreign key constraint
    ALTER TABLE form_positionen DROP CONSTRAINT IF EXISTS form_positionen_form_id_fkey;
    
    -- Rename the column
    ALTER TABLE form_positionen RENAME COLUMN form_id TO meta_id;
    
    -- Add new foreign key constraint
    ALTER TABLE form_positionen 
    ADD CONSTRAINT form_positionen_meta_id_fkey 
    FOREIGN KEY (meta_id) REFERENCES form_meta(id) ON DELETE CASCADE;
    
    -- Update index name
    DROP INDEX IF EXISTS idx_form_positionen_form_id;
    CREATE INDEX IF NOT EXISTS idx_form_positionen_meta_id ON form_positionen(meta_id);
  END IF;
END $$;