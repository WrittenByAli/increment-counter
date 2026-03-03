-- ============================================================
-- ROTI NEXUS - Supabase Setup Script
-- Run this ENTIRE script in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================

-- 1. Create the counters table
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- 2. Create the applications table
CREATE TABLE IF NOT EXISTS applications (
  id BIGINT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approvals TEXT[] NOT NULL DEFAULT '{}',
  submitted_by TEXT,
  timestamp BIGINT NOT NULL
);

-- 3. Create the logs table
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT PRIMARY KEY,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- 4. Insert initial counter data
INSERT INTO counters (name, count) VALUES
  ('shahzad', 23),
  ('hanan', 6),
  ('mazhar', 35),
  ('hassam', 18),
  ('bilal', 24),
  ('momin', 15),
  ('taaha', 45),
  ('quddoos', 18),
  ('qadeer', 26),
  ('ali', 27),
  ('abdullah', 32),
  ('hammad', 34),
  ('huzaifa', 26),
  ('ibtasam', 41),
  ('muhammad', 26),
  ('chair', 11),
  ('hamza', 5),
  ('marwan', 25),
  ('shahmeer', 25)
ON CONFLICT (name) DO NOTHING;

-- 5. Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE counters, applications, logs;

-- 6. Enable Row Level Security (RLS) but allow all operations via anon key
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon users (public app)
CREATE POLICY "Allow all on counters" ON counters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on applications" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logs" ON logs FOR ALL USING (true) WITH CHECK (true);
