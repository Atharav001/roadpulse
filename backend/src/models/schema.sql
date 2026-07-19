-- RoadPulse Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'authority')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wards table
CREATE TABLE IF NOT EXISTS wards (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photos JSONB DEFAULT '[]'::jsonb,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  text TEXT,
  issue_type VARCHAR(100),
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  landmark_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_reported_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('reported', 'routed', 'in_progress', 'resolved')) DEFAULT 'reported',
  issue_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  department VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
  ward_id VARCHAR(50) REFERENCES wards(id) ON DELETE SET NULL,
  landmark_description TEXT,
  report_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident Reports join table
CREATE TABLE IF NOT EXISTS incident_reports (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, report_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incident_reports_incident_id ON incident_reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_report_id ON incident_reports(report_id);
