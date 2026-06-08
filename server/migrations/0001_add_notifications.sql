-- Notifications table for user-facing alerts
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'rental_status',
    'asset_status',
    'payment',
    'dispute',
    'sanad',
    'system',
    'overdue_warning'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  type notification_type NOT NULL,
  title text NOT NULL,
  title_ar text,
  body text NOT NULL,
  body_ar text,
  reference_type text,
  reference_id integer,
  read boolean NOT NULL DEFAULT false,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(user_id, read);
