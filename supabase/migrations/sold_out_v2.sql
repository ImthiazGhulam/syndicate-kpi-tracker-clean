-- Sold Out Playbook v2: Add new columns for 6-stage AI-powered offer builder
ALTER TABLE offer_playbooks ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE offer_playbooks ADD COLUMN IF NOT EXISTS path_planner jsonb DEFAULT '{}'::jsonb;
ALTER TABLE offer_playbooks ADD COLUMN IF NOT EXISTS comms jsonb DEFAULT '{}'::jsonb;
ALTER TABLE offer_playbooks ADD COLUMN IF NOT EXISTS generated_dip text;
