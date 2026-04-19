-- G-MIX Supabase hardening migration
-- Applies schema fixes, RLS fixes and data repairs on an existing project.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE IF EXISTS public.organizations
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.game_sessions
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

ALTER TABLE IF EXISTS public.game_sessions
    ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'game_sessions'
          AND column_name = 'settings'
    ) THEN
        EXECUTE $sql$
            UPDATE public.game_sessions
            SET config = COALESCE(config, settings, '{}'::jsonb)
            WHERE config IS NULL OR config = '{}'::jsonb
        $sql$;

        EXECUTE 'ALTER TABLE public.game_sessions DROP COLUMN settings';
    END IF;
END $$;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN scenario_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN formateur_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN description SET DEFAULT '';

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN config SET DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN current_turn SET DEFAULT 0;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN total_turns SET DEFAULT 6;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN current_turn SET NOT NULL;

ALTER TABLE IF EXISTS public.game_sessions
    ALTER COLUMN total_turns SET NOT NULL;

ALTER TABLE IF EXISTS public.game_sessions
    DROP CONSTRAINT IF EXISTS game_sessions_required_links_when_not_draft;

ALTER TABLE IF EXISTS public.game_sessions
    ADD CONSTRAINT game_sessions_required_links_when_not_draft
    CHECK (status = 'draft' OR (scenario_id IS NOT NULL AND formateur_id IS NOT NULL));

ALTER TABLE IF EXISTS public.game_sessions
    DROP CONSTRAINT IF EXISTS game_sessions_turn_bounds;

ALTER TABLE IF EXISTS public.game_sessions
    ADD CONSTRAINT game_sessions_turn_bounds
    CHECK (current_turn >= 0 AND current_turn <= total_turns);

CREATE TABLE IF NOT EXISTS public.organization_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('formateur', 'joueur')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.organization_invites
    ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_organization ON public.game_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_formateur ON public.game_sessions(formateur_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_scenario ON public.game_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_active_email
    ON public.organization_invites (organization_id, lower(email), role)
    WHERE email IS NOT NULL AND accepted_at IS NULL;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turn_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Rebuild the policies from the hardened source of truth.
DO $$
DECLARE
    policy_row RECORD;
BEGIN
    FOR policy_row IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'organizations',
              'profiles',
              'scenarios',
              'game_sessions',
              'teams',
              'team_members',
              'turns',
              'decisions',
              'turn_results',
              'organization_invites'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            policy_row.policyname,
            policy_row.schemaname,
            policy_row.tablename
        );
    END LOOP;
END $$;

CREATE POLICY org_read_member ON public.organizations
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organizations.id
        )
    );

CREATE POLICY org_insert_owner ON public.organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND owner_id = auth.uid()
    );

CREATE POLICY org_manage_own ON public.organizations
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            owner_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles actor
                WHERE actor.id = auth.uid()
                  AND actor.organization_id = organizations.id
                  AND actor.role IN ('admin', 'organisme')
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            owner_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles actor
                WHERE actor.id = auth.uid()
                  AND actor.organization_id = organizations.id
                  AND actor.role IN ('admin', 'organisme')
            )
        )
    );

CREATE POLICY profile_read_own ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL AND id = auth.uid());

CREATE POLICY profile_read_org ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id IS NOT NULL
              AND actor.organization_id = profiles.organization_id
        )
    );

CREATE POLICY profile_update_own_safe ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL AND id = auth.uid())
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND id = auth.uid()
        AND role = (
            SELECT current_profile.role
            FROM public.profiles AS current_profile
            WHERE current_profile.id = auth.uid()
        )
        AND organization_id IS NOT DISTINCT FROM (
            SELECT current_profile.organization_id
            FROM public.profiles AS current_profile
            WHERE current_profile.id = auth.uid()
        )
    );

CREATE POLICY profile_manage_org ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id IS NOT NULL
              AND actor.organization_id = profiles.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            profiles.organization_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.profiles actor
                WHERE actor.id = auth.uid()
                  AND actor.organization_id = profiles.organization_id
                  AND actor.role IN ('admin', 'organisme')
            )
        )
    );

CREATE POLICY scenario_read_org ON public.scenarios
    FOR SELECT TO authenticated
    USING (
        is_template = TRUE
        OR (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.profiles actor
                WHERE actor.id = auth.uid()
                  AND actor.organization_id = scenarios.organization_id
            )
        )
    );

CREATE POLICY scenario_insert_org ON public.scenarios
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = scenarios.organization_id
              AND actor.role IN ('admin', 'organisme', 'formateur')
        )
    );

CREATE POLICY scenario_manage_org ON public.scenarios
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.profiles actor
                WHERE actor.id = auth.uid()
                  AND actor.organization_id = scenarios.organization_id
                  AND actor.role IN ('admin', 'organisme')
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = scenarios.organization_id
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR scenarios.created_by = auth.uid()
              )
        )
    );

CREATE POLICY session_read_org ON public.game_sessions
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = game_sessions.organization_id
        )
    );

CREATE POLICY session_insert_org ON public.game_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = game_sessions.organization_id
              AND actor.role IN ('admin', 'organisme', 'formateur')
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR game_sessions.formateur_id IS NULL
                  OR game_sessions.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY session_manage_org ON public.game_sessions
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = game_sessions.organization_id
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR game_sessions.formateur_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = game_sessions.organization_id
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR game_sessions.formateur_id = auth.uid()
                  OR game_sessions.formateur_id IS NULL
              )
        )
    );

CREATE POLICY team_read_session ON public.teams
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = teams.id
                  AND tm.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.game_sessions gs
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE gs.id = teams.session_id
                  AND actor.id = auth.uid()
            )
        )
    );

CREATE POLICY team_manage_session ON public.teams
    FOR ALL TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.game_sessions gs
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE gs.id = teams.session_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.game_sessions gs
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE gs.id = teams.session_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY team_member_read_session ON public.team_members
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            team_members.user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.team_members teammate
                WHERE teammate.team_id = team_members.team_id
                  AND teammate.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.teams t
                JOIN public.game_sessions gs ON gs.id = t.session_id
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE t.id = team_members.team_id
                  AND actor.id = auth.uid()
            )
        )
    );

CREATE POLICY team_member_manage_session ON public.team_members
    FOR ALL TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.game_sessions gs ON gs.id = t.session_id
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE t.id = team_members.team_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.game_sessions gs ON gs.id = t.session_id
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE t.id = team_members.team_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY turn_read_session ON public.turns
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.game_sessions gs
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE gs.id = turns.session_id
              AND actor.id = auth.uid()
        )
    );

CREATE POLICY turn_manage_session ON public.turns
    FOR ALL TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.game_sessions gs
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE gs.id = turns.session_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.game_sessions gs
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE gs.id = turns.session_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY decision_read_session ON public.decisions
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            decisions.user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = decisions.team_id
                  AND tm.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.teams t
                JOIN public.game_sessions gs ON gs.id = t.session_id
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE t.id = decisions.team_id
                  AND actor.id = auth.uid()
            )
        )
    );

CREATE POLICY decision_insert_member ON public.decisions
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND decisions.user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.team_members tm
            JOIN public.teams t ON t.id = tm.team_id
            JOIN public.turns tr ON tr.session_id = t.session_id
            WHERE tm.team_id = decisions.team_id
              AND tm.user_id = auth.uid()
              AND tr.id = decisions.turn_id
        )
    );

CREATE POLICY decision_update_member ON public.decisions
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            decisions.user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.teams t
                JOIN public.game_sessions gs ON gs.id = t.session_id
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE t.id = decisions.team_id
                  AND actor.id = auth.uid()
                  AND (
                      actor.role IN ('admin', 'organisme')
                      OR gs.formateur_id = auth.uid()
                  )
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            decisions.user_id = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM public.teams t
                JOIN public.game_sessions gs ON gs.id = t.session_id
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE t.id = decisions.team_id
                  AND actor.id = auth.uid()
                  AND (
                      actor.role IN ('admin', 'organisme')
                      OR gs.formateur_id = auth.uid()
                  )
            )
        )
    );

CREATE POLICY decision_delete_staff ON public.decisions
    FOR DELETE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.game_sessions gs ON gs.id = t.session_id
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE t.id = decisions.team_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY result_read_session ON public.turn_results
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND (
            EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = turn_results.team_id
                  AND tm.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.turns tr
                JOIN public.game_sessions gs ON gs.id = tr.session_id
                JOIN public.profiles actor ON actor.organization_id = gs.organization_id
                WHERE tr.id = turn_results.turn_id
                  AND actor.id = auth.uid()
            )
        )
    );

CREATE POLICY result_manage_session ON public.turn_results
    FOR ALL TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.turns tr
            JOIN public.game_sessions gs ON gs.id = tr.session_id
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE tr.id = turn_results.turn_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.turns tr
            JOIN public.game_sessions gs ON gs.id = tr.session_id
            JOIN public.profiles actor ON actor.organization_id = gs.organization_id
            WHERE tr.id = turn_results.turn_id
              AND actor.id = auth.uid()
              AND (
                  actor.role IN ('admin', 'organisme')
                  OR gs.formateur_id = auth.uid()
              )
        )
    );

CREATE POLICY invites_select_org ON public.organization_invites
    FOR SELECT TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organization_invites.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    );

CREATE POLICY invites_insert_org ON public.organization_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND invited_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organization_invites.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    );

CREATE POLICY invites_update_org ON public.organization_invites
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organization_invites.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organization_invites.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    );

CREATE POLICY invites_delete_org ON public.organization_invites
    FOR DELETE TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.profiles actor
            WHERE actor.id = auth.uid()
              AND actor.organization_id = organization_invites.organization_id
              AND actor.role IN ('admin', 'organisme')
        )
    );

-- Data repair: create missing profiles from auth.users.
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'first_name', ''),
    COALESCE(u.raw_user_meta_data->>'last_name', ''),
    CASE
        WHEN COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'joueur') IN ('admin', 'organisme', 'formateur', 'joueur')
            THEN COALESCE(NULLIF(u.raw_user_meta_data->>'role', ''), 'joueur')
        ELSE 'joueur'
    END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Keep profile emails aligned with auth.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS DISTINCT FROM u.email;

-- Reconstruct owner_id where missing from existing organization members.
UPDATE public.organizations o
SET owner_id = (
    SELECT p.id
    FROM public.profiles p
    WHERE p.organization_id = o.id
      AND p.role IN ('organisme', 'admin')
    ORDER BY CASE WHEN p.role = 'organisme' THEN 0 ELSE 1 END, p.created_at
    LIMIT 1
)
WHERE o.owner_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.organization_id = o.id
        AND p.role IN ('organisme', 'admin')
  );

-- Align auth metadata with existing profile rows.
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'first_name', p.first_name,
    'last_name', p.last_name,
    'role', p.role
)
FROM public.profiles p
WHERE p.id = u.id
  AND (
      u.raw_user_meta_data->>'first_name' IS DISTINCT FROM p.first_name
      OR u.raw_user_meta_data->>'last_name' IS DISTINCT FROM p.last_name
      OR u.raw_user_meta_data->>'role' IS DISTINCT FROM p.role
  );

COMMIT;
