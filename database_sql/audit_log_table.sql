---------------------------------------------------------
-- AUDIT LOG TABLE
-- Tracks all system activities and changes
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id varchar(255),
  details text,
  ip_address varchar(45),
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated operations
CREATE POLICY "Allow all operations on audit_log" ON audit_log
  FOR ALL USING (true);

