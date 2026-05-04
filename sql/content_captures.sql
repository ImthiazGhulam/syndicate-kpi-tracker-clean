-- Content Capture System table
CREATE TABLE content_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  captures JSONB DEFAULT '[]',
  manual_capture JSONB DEFAULT '{}',
  hook_template TEXT,
  hook_text TEXT,
  output_format TEXT,
  cta_type TEXT DEFAULT 'youtube',
  custom_cta TEXT,
  generated_content TEXT,
  current_stage INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast client lookups
CREATE INDEX idx_content_captures_client ON content_captures(client_id);

-- RLS
ALTER TABLE content_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can manage their own content captures"
  ON content_captures FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE email = auth.email()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE email = auth.email()));

CREATE POLICY "Service role full access on content_captures"
  ON content_captures FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
