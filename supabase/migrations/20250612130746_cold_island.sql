/*
  # Add kommentar field to form_positionen table

  1. Schema Changes
    - Add `kommentar` column to `form_positionen` table
    - Column stores optional comments for each position
    - Field is nullable to support existing data

  2. Notes
    - This field will store user comments for each position
    - Comments are optional and can be added via checkbox in UI
    - Field is included in all data operations
*/

-- Add kommentar column to form_positionen table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_positionen' AND column_name = 'kommentar'
  ) THEN
    ALTER TABLE form_positionen ADD COLUMN kommentar text;
  END IF;
END $$;