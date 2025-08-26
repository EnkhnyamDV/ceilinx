/*
  # Update form_meta table structure

  1. Changes
    - Rename `supplier_name` to `lieferantenname` for German naming consistency
    - Rename `calculation_id` to `kalkulation_id` for German naming consistency
    - Update existing data to maintain consistency

  2. Security
    - Maintain existing RLS policies
    - Keep all existing indexes and constraints
*/

-- Rename columns to match German naming convention
DO $$
BEGIN
  -- Check if supplier_name exists and lieferantenname doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_meta' AND column_name = 'supplier_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_meta' AND column_name = 'lieferantenname'
  ) THEN
    ALTER TABLE form_meta RENAME COLUMN supplier_name TO lieferantenname;
  END IF;

  -- Check if calculation_id exists and kalkulation_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_meta' AND column_name = 'calculation_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_meta' AND column_name = 'kalkulation_id'
  ) THEN
    ALTER TABLE form_meta RENAME COLUMN calculation_id TO kalkulation_id;
  END IF;
END $$;