-- G-MIX Supabase Schema
-- Standard pattern: profiles.id = auth.users.id

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    contact_email VARCHAR(255),
    max_formateurs INTEGER DEFAULT 1,
    max_scenarios INTEGER DEFAULT 3,
    max_sessions INTEGER DEFAULT 5,
    ai_generation_enabled BOOLEAN DEFAULT FALSE,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- profiles.id = auth.users.id (standard Supabase pattern)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'joueur' CHECK (role IN ('admin', 'organisme', 'formateur', 'joueur')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Scenarios ────────────────────────────────────────────────────────────────
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    config JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Game Sessions ────────────────────────────────────────────────────────────
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID REFERENCES scenarios(id) ON DELETE RESTRICT,
    formateur_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    current_turn INTEGER DEFAULT 0,
    total_turns INTEGER DEFAULT 6,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- ─── Teams ────────────────────────────────────────────────────────────────────
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Team Members ─────────────────────────────────────────────────────────────
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- ─── Turns ────────────────────────────────────────────────────────────────────
CREATE TABLE turns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'closed')),
    deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(session_id, turn_number)
);

-- ─── Decisions ────────────────────────────────────────────────────────────────
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turn_id UUID REFERENCES turns(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turn_id, team_id)
);

-- ─── Turn Results ─────────────────────────────────────────────────────────────
CREATE TABLE turn_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turn_id UUID REFERENCES turns(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    kpis JSONB NOT NULL DEFAULT '{}',
    score DECIMAL(10,2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turn_id, team_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_scenarios_organization ON scenarios(organization_id);
CREATE INDEX idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX idx_game_sessions_scenario ON game_sessions(scenario_id);
CREATE INDEX idx_game_sessions_formateur ON game_sessions(formateur_id);
CREATE INDEX idx_game_sessions_organization ON game_sessions(organization_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_teams_session ON teams(session_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_turns_session ON turns(session_id);
CREATE INDEX idx_decisions_turn ON decisions(turn_id);
CREATE INDEX idx_decisions_team ON decisions(team_id);
CREATE INDEX idx_turn_results_turn ON turn_results(turn_id);
CREATE INDEX idx_turn_results_team ON turn_results(team_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_results ENABLE ROW LEVEL SECURITY;

-- Policies in policies.sql

-- ─── Auto-create profile on signup (trigger) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'joueur')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
