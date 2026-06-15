-- Add notifications table for in-app / email / SMS notification tracking
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  channels_json jsonb NOT NULL DEFAULT '[]',
  metadata_json jsonb,
  status text NOT NULL DEFAULT 'pending',
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_status_idx ON notifications(status);
