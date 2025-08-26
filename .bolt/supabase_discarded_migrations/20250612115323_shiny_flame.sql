/*
  # Add sample langtext data for testing

  1. Sample Data Updates
    - Add detailed descriptions (langtext) to existing sample positions
    - Provide realistic construction-related detailed descriptions
    - Enable immediate testing of the langtext functionality

  2. Purpose
    - Test the collapsible langtext feature
    - Provide realistic example data for development
*/

-- Update sample positions with langtext
UPDATE form_positionen 
SET langtext = CASE 
  WHEN oz = '1.1' THEN 'Herstellung von Betonfundamenten aus C25/30 Beton nach DIN EN 206. Einschließlich Schalung, Bewehrung mit Betonstahl BSt 500 S, Verdichtung mittels Innenrüttler und Nachbehandlung. Fundamentabmessungen: 40cm x 40cm x 60cm Tiefe. Aushub und Verfüllung sind gesondert zu kalkulieren.'
  WHEN oz = '1.2' THEN 'Lieferung und Montage von Stahlträgern IPE 200 nach DIN 1025-5. Länge 6,00m, Werkstoff S235JR. Einschließlich Anstrich mit 2-lagigem Korrosionsschutz nach DIN EN ISO 12944. Montage erfolgt mittels Kran, Krankosten sind gesondert zu berücksichtigen.'
  WHEN oz = '2.1.1' THEN 'Dacheindeckung mit Tondachziegeln, Farbe rot, Format ca. 24x38cm. Einschließlich Lattung 30/50mm und Konterlattung 50/30mm aus Nadelholz C24. Befestigung der Ziegel mit Sturmklammern alle 5. Reihe. Traufziegel und Firstziegel sind im Preis enthalten.'
  WHEN oz = '2.1.2' THEN 'Herstellung von Zementestrich CT-C25-F4 nach DIN EN 13813. Schichtdicke 65mm auf Trennlage. Einschließlich Randstreifen, Fugenausbildung und Oberflächenbehandlung. Estrich ist begehbar nach 3 Tagen, voll belastbar nach 28 Tagen.'
  WHEN oz = '3' THEN 'Wärmedämmung der Außenwände mit EPS-Dämmplatten WLG 032, Dicke 160mm nach DIN EN 13163. Verklebung und mechanische Befestigung mit Tellerdübeln. Einschließlich Armierungsgewebe und Grundierung für nachfolgende Putzarbeiten.'
  WHEN oz = '4.1' THEN 'Trockenbau mit Gipskartonplatten GKB 12,5mm nach DIN EN 520. Montage auf Metallständerwerk 100mm CW-Profile. Einschließlich Spachtelung der Fugen und Schraubenlöcher, Q2-Qualität nach VOB/C. Grundierung für Anstricharbeiten ist enthalten.'
  WHEN oz = '4.2' THEN 'Zwischensparrendämmung mit Mineralwolle WLG 035, Dicke 100mm nach DIN EN 13162. Klemmende Verlegung zwischen Holzsparren. Einschließlich Dampfbremse sd ≥ 2m auf der Raumseite. Material ist nicht brennbar (A1) und schimmelfrei.'
  WHEN oz = '5.1' THEN 'Kunststofffenster 3-fach verglast, Uw-Wert ≤ 0,95 W/m²K. Rahmen weiß, Beschlag für Dreh-Kipp-Funktion. Verglasung 4/16/4/16/4mm mit Edelgasfüllung. Einschließlich Einbau, Abdichtung und Anschluss an Wärmedämmung. RAL-Montage nach Güterichtlinie.'
  ELSE langtext
END
WHERE meta_id = 'abc123e4-5678-9012-3456-789012345678';