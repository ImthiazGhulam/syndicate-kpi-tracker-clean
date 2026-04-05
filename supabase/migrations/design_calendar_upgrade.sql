-- Misogi upgrade: support event vs project types
ALTER TABLE life_design ADD COLUMN IF NOT EXISTS misogi_type TEXT DEFAULT 'event'; -- 'event' or 'project'
ALTER TABLE life_design ADD COLUMN IF NOT EXISTS misogi_date DATE; -- single event target date
ALTER TABLE life_design ADD COLUMN IF NOT EXISTS misogi_start_date DATE; -- project start
ALTER TABLE life_design ADD COLUMN IF NOT EXISTS misogi_end_date DATE; -- project end/target

-- Misogi milestones (for ongoing project type)
CREATE TABLE IF NOT EXISTS misogi_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  target_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_misogi_milestones_client ON misogi_milestones(client_id, year);

-- Misogi recurring work blocks (for ongoing project type)
CREATE TABLE IF NOT EXISTS misogi_recurring_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  days_of_week INTEGER[] DEFAULT '{}', -- 0=Sun, 1=Mon, ..., 6=Sat
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_misogi_blocks_client ON misogi_recurring_blocks(client_id, year);

-- Mini adventures: add proper date field
ALTER TABLE mini_adventures ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Days off: weekly recurring + date ranges
CREATE TABLE IF NOT EXISTS days_off (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  category TEXT DEFAULT 'yearly', -- 'weekly', 'monthly', 'quarterly', 'yearly'
  day_of_week INTEGER, -- 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  off_date DATE, -- start date (for ranges) or single date
  end_date DATE, -- end date (for ranges, nullable)
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_days_off_client ON days_off(client_id, year);

-- RLS policies
ALTER TABLE misogi_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE misogi_recurring_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE days_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own misogi milestones" ON misogi_milestones FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own misogi blocks" ON misogi_recurring_blocks FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own days off" ON days_off FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
