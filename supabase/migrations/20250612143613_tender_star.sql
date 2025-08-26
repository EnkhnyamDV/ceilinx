/*
  # Add general comment field to form_meta table

  1. Changes
    - Add `allgemeiner_kommentar` column to `form_meta` table
    - Column is optional (nullable) and stores general comments from suppliers

  2. Security
    - No changes to RLS policies needed as existing policies cover this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_meta' AND column_name = 'allgemeiner_kommentar'
  ) THEN
    ALTER TABLE form_meta ADD COLUMN allgemeiner_kommentar text;
  END IF;
END $$;