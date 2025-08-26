/*
  # Add sample data for testing

  1. Sample Data
    - Create a test form_meta entry
    - Add sample positions for the form
    - Use realistic construction data

  2. Purpose
    - Enable immediate testing of the application
    - Provide realistic example data
*/

-- Insert sample form_meta data
INSERT INTO form_meta (id, lieferantenname, status, kalkulation_id) 
VALUES (
  'abc123e4-5678-9012-3456-789012345678',
  'Mustermann Bau GmbH',
  'draft',
  'KALK-2024-001'
) ON CONFLICT (id) DO NOTHING;

-- Insert sample positions
INSERT INTO form_positionen (meta_id, oz, bezeichnung, menge, einheit, einzelpreis_netto) VALUES
  ('abc123e4-5678-9012-3456-789012345678', '1.1', 'Betonfundament 40x40x60 cm', 12, 'Stk', 0),
  ('abc123e4-5678-9012-3456-789012345678', '1.2', 'Stahlträger IPE 200, Länge 6m', 8, 'Stk', 0),
  ('abc123e4-5678-9012-3456-789012345678', '2.1.1', 'Dachziegel Tondachziegel rot, pro m²', 150, 'm²', 0),
  ('abc123e4-5678-9012-3456-789012345678', '2.1.2', 'Zementestrich C25/30, pro m²', 85, 'm²', 0),
  ('abc123e4-5678-9012-3456-789012345678', '3', 'Wärmedämmung EPS 032, 16cm', 120, 'm²', 0),
  ('abc123e4-5678-9012-3456-789012345678', '4.1', 'Gipskartonplatte 12,5mm', 200, 'm²', 0),
  ('abc123e4-5678-9012-3456-789012345678', '4.2', 'Mineralwolle Dämmung 10cm', 180, 'm²', 0),
  ('abc123e4-5678-9012-3456-789012345678', '5.1', 'Fenster Kunststoff 120x100cm', 6, 'Stk', 0)
ON CONFLICT DO NOTHING;