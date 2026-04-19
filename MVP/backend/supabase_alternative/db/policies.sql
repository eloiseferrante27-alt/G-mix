-- G-MIX Supabase RLS Policies
-- profiles.id = auth.users.id — use auth.uid() directly

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE POLICY org_read_own ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = organizations.id
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY org_write_admin ON organizations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = organizations.id
            AND profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY profile_read_own ON profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY profile_read_org ON profiles
    FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY profile_update_own ON profiles
    FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY profile_admin_manage ON profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.organization_id = profiles.organization_id
            AND p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

-- ─── Scenarios ────────────────────────────────────────────────────────────────
CREATE POLICY scenario_read_org ON scenarios
    FOR SELECT
    USING (
        organization_id IS NULL OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = scenarios.organization_id
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY scenario_write_creator ON scenarios
    FOR ALL
    USING (created_by = auth.uid());

-- ─── Game Sessions ────────────────────────────────────────────────────────────
CREATE POLICY session_read_org ON game_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.organization_id = game_sessions.organization_id
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY session_write_formateur ON game_sessions
    FOR ALL
    USING (formateur_id = auth.uid());

-- ─── Teams ────────────────────────────────────────────────────────────────────
CREATE POLICY team_read_participant ON teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM game_sessions gs
            WHERE gs.id = teams.session_id
            AND gs.formateur_id = auth.uid()
        )
    );

CREATE POLICY team_write_formateur ON teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            WHERE gs.id = teams.session_id
            AND gs.formateur_id = auth.uid()
        )
    );

-- ─── Team Members ─────────────────────────────────────────────────────────────
CREATE POLICY team_member_read_member ON team_members
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY team_member_write_formateur ON team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN teams t ON t.session_id = gs.id
            WHERE t.id = team_members.team_id
            AND gs.formateur_id = auth.uid()
        )
    );

-- ─── Turns ────────────────────────────────────────────────────────────────────
CREATE POLICY turn_read_participant ON turns
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            WHERE gs.id = turns.session_id
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.organization_id = gs.organization_id
                AND profiles.id = auth.uid()
            )
        )
    );

CREATE POLICY turn_write_formateur ON turns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM game_sessions gs
            WHERE gs.id = turns.session_id
            AND gs.formateur_id = auth.uid()
        )
    );

-- ─── Decisions ────────────────────────────────────────────────────────────────
CREATE POLICY decision_read_team ON decisions
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = decisions.team_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY decision_write_own ON decisions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY decision_update_own ON decisions
    FOR UPDATE
    USING (user_id = auth.uid());

-- ─── Turn Results ─────────────────────────────────────────────────────────────
CREATE POLICY result_read_participant ON turn_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = turn_results.team_id
            AND tm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM game_sessions gs
            JOIN turns t ON t.session_id = gs.id
            WHERE t.id = turn_results.turn_id
            AND gs.formateur_id = auth.uid()
        )
    );
