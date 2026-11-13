PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  service TEXT NOT NULL CHECK(service IN ('vocal','mix','beat')),
  starts_at INTEGER NOT NULL, duration INTEGER NOT NULL CHECK(duration BETWEEN 1 AND 8),
  status TEXT NOT NULL CHECK(status IN ('pending','confirmed','completed','cancelled','expired')),
  note TEXT NOT NULL DEFAULT '', comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  hold_until INTEGER, version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS bookings_date ON bookings(starts_at);
CREATE INDEX IF NOT EXISTS bookings_created ON bookings(created_at);
CREATE TABLE IF NOT EXISTS booking_slots (
  starts_at INTEGER PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS booking_sessions (
  token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS booking_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS booking_settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  action TEXT NOT NULL, created_at INTEGER NOT NULL
);
