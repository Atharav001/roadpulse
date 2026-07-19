-- RoadPulse Database Schema (aligned to final plan)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  issue_types_handled TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wards (boundary_geo kept as optional text/json for hackathon; centers used for lookup)
CREATE TABLE IF NOT EXISTS wards (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  boundary_geo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users: email or device_id stored in device_id_or_email (email column kept as alias via view-compat)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'authority')),
  department VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports: two photos + GPS at capture + AI outputs
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_closeup_url TEXT,
  photo_context_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  captured_at TIMESTAMP,
  text_description TEXT,
  text TEXT,
  issue_type VARCHAR(100),
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  landmark_description TEXT,
  raw_classification_result JSONB,
  nearby_landmarks JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents: merged, routed, email-drafted
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  ward_id VARCHAR(50) REFERENCES wards(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('reported', 'routed', 'in_progress', 'resolved')) DEFAULT 'reported',
  department VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
  report_count INTEGER DEFAULT 1,
  first_reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  landmark_description TEXT,
  draft_email_subject TEXT,
  draft_email_body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_reports (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, report_id)
);

-- Safe additive migrations for existing DBs
ALTER TABLE wards ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10, 8);
ALTER TABLE wards ADD COLUMN IF NOT EXISTS center_lng DECIMAL(11, 8);
ALTER TABLE wards ADD COLUMN IF NOT EXISTS boundary_geo TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_closeup_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_context_url TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS text_description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS raw_classification_result JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS nearby_landmarks JSONB;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS last_reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS draft_email_subject TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS draft_email_body TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_ward_id ON incidents(ward_id);
CREATE INDEX IF NOT EXISTS idx_incidents_department ON incidents(department);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_issue_type ON incidents(issue_type);
CREATE INDEX IF NOT EXISTS idx_incident_reports_incident_id ON incident_reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_report_id ON incident_reports(report_id);
