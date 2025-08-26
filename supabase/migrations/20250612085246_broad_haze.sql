/*
  # Add ninox_nr field to form_positionen table

  1. Schema Changes
    - Add `ninox_nr` column to `form_positionen` table
    - Column stores the unique Ninox record ID for each position
    - Field is nullable to support existing data

  2. Notes
    - This field will be populated from Ninox data when forms are created
    - Field is used for synchronization between Supabase and Ninox
    - Not visible in the UI but included in all data operations
*/

-- Add ninox_nr column to form_positionen table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'form_positionen' AND column_name = 'ninox_nr'
  ) THEN
    ALTER TABLE form_positionen ADD COLUMN ninox_nr text;
  END IF;
END $$;

-- Add index for better performance when querying by ninox_nr
CREATE INDEX IF NOT EXISTS idx_form_positionen_ninox_nr 
ON form_positionen USING btree (ninox_nr);