-- G-MIX RLS Policies — source of truth, matches production
-- profiles.id = auth.users.id → use auth.uid() directly
-- Roles: admin (platform) | organisme (org owner) | formateur | joueur

-- ── Organizations ─────────────────────────────────────────────────────────────
CREATE POLICY org_select ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY org_insert ON organizations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY org_update ON organizations FOR UPDATE USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY org_delete ON organizations FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY profile_select ON profiles FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR (organization_id IS NOT NULL
      AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
);
CREATE POLICY profile_update ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY profile_delete ON profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Organization Invites ───────────────────────────────────────────────────────
CREATE POLICY invites_select ON organization_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = organization_invites.organization_id AND p.role IN ('organisme','formateur'))
);
CREATE POLICY invites_insert ON organization_invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = organization_invites.organization_id AND p.role IN ('organisme','formateur'))
);
CREATE POLICY invites_delete ON organization_invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = organization_invites.organization_id AND p.role IN ('organisme','formateur'))
);

-- ── Scenarios ─────────────────────────────────────────────────────────────────
CREATE POLICY scenario_select ON scenarios FOR SELECT USING (
  is_template = true OR organization_id IS NULL
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = scenarios.organization_id)
);
CREATE POLICY scenario_insert ON scenarios FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','organisme','formateur'))
);
CREATE POLICY scenario_update ON scenarios FOR UPDATE USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = scenarios.organization_id AND p.role = 'organisme')
);
CREATE POLICY scenario_delete ON scenarios FOR DELETE USING (
  created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = scenarios.organization_id AND p.role = 'organisme')
);

-- ── Game Sessions ─────────────────────────────────────────────────────────────
CREATE POLICY session_select ON game_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = game_sessions.organization_id)
);
CREATE POLICY session_insert ON game_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = game_sessions.organization_id AND p.role IN ('organisme','formateur'))
);
CREATE POLICY session_update ON game_sessions FOR UPDATE USING (
  formateur_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = game_sessions.organization_id AND p.role = 'organisme')
);
CREATE POLICY session_delete ON game_sessions FOR DELETE USING (
  formateur_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = game_sessions.organization_id AND p.role = 'organisme')
);

-- ── Teams ─────────────────────────────────────────────────────────────────────
CREATE POLICY team_select ON teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.organization_id = gs.organization_id WHERE gs.id = teams.session_id AND p.id = auth.uid())
);
CREATE POLICY team_write ON teams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.id = auth.uid() WHERE gs.id = teams.session_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.id = auth.uid() WHERE gs.id = teams.session_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  );

-- ── Team Members ──────────────────────────────────────────────────────────────
CREATE POLICY team_member_select ON team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM teams t JOIN game_sessions gs ON gs.id = t.session_id JOIN profiles p ON p.organization_id = gs.organization_id WHERE t.id = team_members.team_id AND p.id = auth.uid())
);
CREATE POLICY team_member_insert ON team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM teams t JOIN game_sessions gs ON gs.id = t.session_id JOIN profiles p ON p.id = auth.uid() WHERE t.id = team_members.team_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
);
CREATE POLICY team_member_delete ON team_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM teams t JOIN game_sessions gs ON gs.id = t.session_id JOIN profiles p ON p.id = auth.uid() WHERE t.id = team_members.team_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
);

-- ── Turns ─────────────────────────────────────────────────────────────────────
CREATE POLICY turn_select ON turns FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.organization_id = gs.organization_id WHERE gs.id = turns.session_id AND p.id = auth.uid())
);
CREATE POLICY turn_write ON turns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.id = auth.uid() WHERE gs.id = turns.session_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.id = auth.uid() WHERE gs.id = turns.session_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  );

-- ── Decisions ─────────────────────────────────────────────────────────────────
CREATE POLICY decision_select ON decisions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = decisions.team_id AND tm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM turns t JOIN game_sessions gs ON gs.id = t.session_id WHERE t.id = decisions.turn_id AND gs.formateur_id = auth.uid())
);
CREATE POLICY decision_insert ON decisions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = decisions.team_id AND tm.user_id = auth.uid())
);
CREATE POLICY decision_update ON decisions FOR UPDATE USING (user_id = auth.uid());

-- ── Turn Results (joueurs ne peuvent pas écrire les résultats) ────────────────
CREATE POLICY turn_result_select ON turn_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = turn_results.team_id AND tm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM turns t JOIN game_sessions gs ON gs.id = t.session_id WHERE t.id = turn_results.turn_id AND gs.formateur_id = auth.uid())
);
CREATE POLICY turn_result_write ON turn_results FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM turns t JOIN game_sessions gs ON gs.id = t.session_id JOIN profiles p ON p.id = auth.uid() WHERE t.id = turn_results.turn_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM turns t JOIN game_sessions gs ON gs.id = t.session_id JOIN profiles p ON p.id = auth.uid() WHERE t.id = turn_results.turn_id AND (gs.formateur_id = auth.uid() OR (p.organization_id = gs.organization_id AND p.role = 'organisme')))
  );

-- ── Session Feedback ──────────────────────────────────────────────────────────
CREATE POLICY feedback_select ON session_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.organization_id = gs.organization_id WHERE gs.id = session_feedback.session_id AND p.id = auth.uid())
);
CREATE POLICY feedback_insert ON session_feedback FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── Learning Resources (lecture publique, écriture staff) ─────────────────────
CREATE POLICY learning_select ON learning_resources FOR SELECT USING (true);
CREATE POLICY learning_write ON learning_resources FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','organisme','formateur')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','organisme','formateur')));

-- ── Chat Messages ─────────────────────────────────────────────────────────────
CREATE POLICY chat_select ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM game_sessions gs JOIN profiles p ON p.organization_id = gs.organization_id WHERE gs.id = chat_messages.session_id AND p.id = auth.uid())
);
CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

