-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create next_auth schema (required by Supabase adapter)
CREATE SCHEMA IF NOT EXISTS next_auth;

-- Users table for storing user profiles
CREATE TABLE IF NOT EXISTS next_auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  "emailVerified" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table for OAuth providers (Google)
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" BIGINT,
  "token_type" TEXT,
  scope TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, "providerAccountId")
);

-- Sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tokens (for email verification if needed later)
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS "accounts_userId_idx" ON next_auth.accounts("userId");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON next_auth.sessions("userId");
CREATE INDEX IF NOT EXISTS "sessions_sessionToken_idx" ON next_auth.sessions("sessionToken");

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION next_auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updatedAt
DROP TRIGGER IF EXISTS update_users_updated_at ON next_auth.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON next_auth.users
  FOR EACH ROW EXECUTE FUNCTION next_auth.update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON next_auth.accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON next_auth.accounts
  FOR EACH ROW EXECUTE FUNCTION next_auth.update_updated_at_column();

-- Grant permissions to service_role (used by NextAuth)
GRANT USAGE ON SCHEMA next_auth TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO postgres, service_role, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO postgres, service_role, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO postgres, service_role, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON TABLES TO postgres, service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA next_auth GRANT ALL ON ROUTINES TO postgres, service_role, authenticated;
