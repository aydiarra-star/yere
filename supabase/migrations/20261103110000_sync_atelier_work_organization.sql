-- Persist the atelier work-organization choice as part of the canonical server profile.
ALTER TABLE public.atelier
  ADD COLUMN mode_organisation text NOT NULL DEFAULT 'independent';

ALTER TABLE public.atelier
  ADD CONSTRAINT atelier_mode_organisation_check
  CHECK (mode_organisation IN ('independent', 'collaborators', 'team'));

-- Match the existing owner/manager RLS policy and column-level profile grants.
GRANT SELECT (mode_organisation) ON TABLE public.atelier TO authenticated;
GRANT UPDATE (mode_organisation) ON TABLE public.atelier TO authenticated;
