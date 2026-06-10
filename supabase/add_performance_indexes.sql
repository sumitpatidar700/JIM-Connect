-- Performance indexes for registrations lookup
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_team_id ON public.registrations(team_id);

-- Indexes for event teams lookup
CREATE INDEX IF NOT EXISTS idx_event_teams_event_id ON public.event_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_event_teams_leader_id ON public.event_teams(leader_id);

-- Indexes for users role filtering and batch filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_batch_id ON public.users(batch_id);

-- Indexes for batch filtering on entities
CREATE INDEX IF NOT EXISTS idx_events_batch_id ON public.events(batch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_batch_id ON public.announcements(batch_id);
CREATE INDEX IF NOT EXISTS idx_winners_batch_id ON public.winners(batch_id);
