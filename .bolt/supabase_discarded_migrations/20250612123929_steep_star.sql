/*
  # Add langtext column to form_positionen table

  1. Schema Changes
    - Add `langtext` column to `form_positionen` table
    - Column stores detailed description text for each position
    - Field is nullable to support existing data

  2. Notes
    - This field will contain detailed descriptions for positions
    - Field is displayed in the UI with toggle functionality
    - Supports existing data without langtext values
*/

-- Add langtext column to form_positionen table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_positionen' AND column_name = 'langtext'
  ) THEN
    ALTER TABLE form_positionen ADD COLUMN langtext text;
  END IF;
END $$;