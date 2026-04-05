-- Add priority execution ratings to weekly_review (Lock In)
ALTER TABLE weekly_review ADD COLUMN IF NOT EXISTS priority_1_rating INTEGER;
ALTER TABLE weekly_review ADD COLUMN IF NOT EXISTS priority_2_rating INTEGER;
ALTER TABLE weekly_review ADD COLUMN IF NOT EXISTS priority_3_rating INTEGER;
ALTER TABLE weekly_review ADD COLUMN IF NOT EXISTS priority_4_rating INTEGER;
