-- G-MIX Supabase RLS Policies
-- These policies control access to tables based on user roles

-- ─── Organizations ────────────────────────────────────────────────────────────
-- Users can see their own organization
CREATE POLICY org_read_own ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = organizations.id
            AND profiles.user_id = auth.uid()
        )
    );

-- Only admins can modify organizations
CREATE POLICY org_write_admin ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = organizations.id
            AND profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY profile_read_own ON profiles
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can read profiles in their organization
CREATE POLICY profile_read_org ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = profiles.id
            AND p.organization_id = (
                SELECT organization_id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Users can update their own profile
CREATE POLICY profile_update_own ON profiles
    FOR UPDATE
    USING (user_id = auth.uid());

-- Admins can manage all profiles in their organization
CREATE POLICY profile_admin_manage ON profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.organization_id = profiles.organization_id
            AND p.user_id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- ─── Scenarios ────────────────────────────────────────────────────────────────
-- Users can read scenarios in their organization
CREATE POLICY scenario_read_org ON scenarios
    FOR SELECT
    USING (
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = scenarios.organization_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Formateurs and admins can create/update/delete their scenarios
CREATE POLICY scenario_write_creator ON scenarios
    FOR ALL
    USING (
        created_by = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- ─── Game Sessions ────────────────────────────────────────────────────────────
-- Users can read sessions in their organization
CREATE POLICY session_read_org ON game_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = game_sessions.organization_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Formateurs can manage their sessions
CREATE POLICY session_write_formateur ON game_sessions
    FOR ALL
    USING (
        formateur_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- ─── Teams ────────────────────────────────────────────────────────────────────
-- Team members can read their teams
CREATE POLICY team_read_member ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Session formateur can manage teams
CREATE POLICY team_write_formateur ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN profiles p ON p.id = gs.formateur_id
            WHERE gs.id = teams.session_id
            AND p.user_id = auth.uid()
        )
    );

-- ─── Team Members ─────────────────────────────────────────────────────────────
-- Users can see their team memberships
CREATE POLICY team_member_read_own ON team_members
    FOR SELECT
    USING (user_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

-- Team members can see other members of their team
CREATE POLICY team_member_read_team ON team_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Formateur can manage team members
CREATE POLICY team_member_write_formateur ON team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN profiles p ON p.id = gs.formateur_id
            WHERE gs.id = (SELECT session_id FROM teams WHERE id = team_members.team_id)
            AND p.user_id = auth.uid()
        )
    );

-- ─── Turns ────────────────────────────────────────────────────────────────────
-- Session participants can read turns
CREATE POLICY turn_read_participant ON turns
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            WHERE gs.id = turns.session_id
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.organization_id = gs.organization_id
                AND profiles.user_id = auth.uid()
            )
        )
    );

-- Formateur can manage turns
CREATE POLICY turn_write_formateur ON turns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN profiles p ON p.id = gs.formateur_id
            WHERE gs.id = turns.session_id
            AND p.user_id = auth.uid()
        )
    );

-- ─── Decisions ────────────────────────────────────────────────────────────────
-- Team members can read decisions for their team
CREATE POLICY decision_read_team ON decisions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = decisions.team_id
            AND tm.user_id = (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Users can create/update their own decisions
CREATE POLICY decision_write_own ON decisions
    FOR ALL
    USING (
        user_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- ─── Turn Results ─────────────────────────────────────────────────────────────
-- Team members can read results for their team
CREATE POLICY result_read_team ON turn_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = turn_results.team_id
            AND tm.user_id = (
                SELECT id FROM profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Formateur can read all results for their sessions
CREATE POLICY result_read_formateur ON turn_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN profiles p ON p.id = gs.formateur_id
            JOIN turns t ON t.session_id = gs.id
            WHERE t.id = turn_results.turn_id
            AND p.user_id = auth.uid()
        )
    );