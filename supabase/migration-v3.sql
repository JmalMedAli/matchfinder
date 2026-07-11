-- ============================================================
-- MATCHFINDER MIGRATION V3 — Football Fields
-- Run after migration.sql (v2)
-- ============================================================


-- ============================================================
-- FOOTBALL FIELDS TABLE
-- ============================================================

CREATE TABLE football_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text NOT NULL,
  latitude decimal(10,7),
  longitude decimal(10,7),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_football_fields_city ON football_fields(city);
CREATE INDEX idx_football_fields_coords ON football_fields(latitude, longitude);


-- ============================================================
-- ADD football_field_id TO MATCHES (nullable for backward compat)
-- ============================================================

ALTER TABLE matches
  ADD COLUMN football_field_id uuid
  REFERENCES football_fields(id)
  ON DELETE SET NULL;


-- ============================================================
-- SEED DATA — Banlieue Sud Tunis
-- ============================================================

INSERT INTO football_fields (name, address, city, latitude, longitude, image_url) VALUES

-- Boumhel
('Stade Municipal de Boumhel', 'Avenue Habib Bourguiba, Boumhel', 'Boumhel', 36.7218000, 10.4369000, NULL),
('Terrain Foot Boumhel Nord', 'Rue de la République, Boumhel', 'Boumhel', 36.7245000, 10.4321000, NULL),

-- Rades
('Stade Olympique de Rades', 'Avenue Habib Thameur, Rades', 'Rades', 36.7667000, 10.2750000, NULL),
('Terrain Synthétique Rades', 'Rue Ali Belhaouane, Rades', 'Rades', 36.7630000, 10.2810000, NULL),

-- Ezzahra
('Stade d''Ezzahra', 'Avenue Mohamed Ali, Ezzahra', 'Ezzahra', 36.7450000, 10.3120000, NULL),
('Terrain Foot Ezzahra Centre', 'Rue Habib Bourguiba, Ezzahra', 'Ezzahra', 36.7475000, 10.3085000, NULL),

-- Hammam Lif
('Stade Municipal Hammam Lif', 'Avenue de la Paix, Hammam Lif', 'Hammam Lif', 36.7280000, 10.3420000, NULL),
('Terrain Synthétique Hammam Lif', 'Rue Ibn Khaldoun, Hammam Lif', 'Hammam Lif', 36.7305000, 10.3380000, NULL),

-- Megrine
('Stade de Megrine', 'Avenue Farhat Hached, Megrine', 'Megrine', 36.7710000, 10.2530000, NULL),
('Terrain Foot Megrine Sud', 'Rue de la Liberté, Megrine', 'Megrine', 36.7685000, 10.2570000, NULL),

-- Ben Arous
('Stade Municipal de Ben Arous', 'Avenue Habib Bourguiba, Ben Arous', 'Ben Arous', 36.7530000, 10.2280000, NULL),
('Terrain Synthétique Ben Arous', 'Rue Abdelhamid Ben Chekroune, Ben Arous', 'Ben Arous', 36.7555000, 10.2245000, NULL);


-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE football_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view football fields"
ON football_fields
FOR SELECT
TO authenticated
USING(true);

CREATE POLICY "Authenticated insert football fields"
ON football_fields
FOR INSERT
TO authenticated
WITH CHECK(true);

CREATE POLICY "Authenticated update football fields"
ON football_fields
FOR UPDATE
TO authenticated
USING(true);

CREATE POLICY "Authenticated delete football fields"
ON football_fields
FOR DELETE
TO authenticated
USING(true);


-- ============================================================
-- END V3
-- ============================================================
