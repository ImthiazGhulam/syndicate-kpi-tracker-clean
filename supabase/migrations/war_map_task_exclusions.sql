-- Per-day exclusions for recurring war map tasks (skip a single occurrence)
CREATE TABLE IF NOT EXISTS war_map_task_exclusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES war_map_tasks(id) ON DELETE CASCADE,
  exclusion_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, exclusion_date)
);

ALTER TABLE war_map_task_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON war_map_task_exclusions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_task_exclusions_task ON war_map_task_exclusions(task_id);
CREATE INDEX idx_task_exclusions_date ON war_map_task_exclusions(exclusion_date);
