-- YÉRÉ Atelier — politiques RLS de base pour Supabase
-- DOCUMENT DE TRAVAIL : non appliqué à une base et non validé en environnement Supabase.
-- À appliquer uniquement après revue, sur un projet YÉRÉ dédié et vide/de développement.
-- Pré-requis : docs/sql/0001_initial_schema.sql appliqué.
--
-- Modèle d'accès :
-- * l'identité vient uniquement de auth.uid();
-- * chaque donnée métier est isolée par atelier_id + appartenance active;
-- * les fonctions SECURITY DEFINER d'autorisation évitent la récursion RLS;
-- * un utilisateur peut créer un atelier et sa propre appartenance propriétaire;
-- * les membres ne peuvent pas se donner eux-mêmes un rôle élevé;
-- * les paiements sont en écriture append-only depuis le client (pas d'UPDATE/DELETE).
-- Cette base ne remplace pas les tests négatifs inter-ateliers ni une revue de sécurité.

BEGIN;

ALTER TABLE public.atelier
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.atelier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atelier_membre ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commande ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiement ENABLE ROW LEVEL SECURITY;

-- Accès explicites : les politiques RLS restent obligatoires en plus des GRANT.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.atelier TO authenticated;
GRANT UPDATE (nom, telephone, ville, devise) ON public.atelier TO authenticated;
GRANT SELECT, INSERT ON public.atelier_membre TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensuration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commande TO authenticated;
GRANT SELECT, INSERT ON public.paiement TO authenticated;
REVOKE ALL ON public.atelier, public.atelier_membre, public.client,
  public.mensuration, public.commande, public.paiement FROM anon;
REVOKE UPDATE, DELETE ON public.paiement FROM authenticated;

-- Fonctions d'autorisation SECURITY DEFINER pour éviter la récursion RLS
-- lorsqu'une politique consulte atelier_membre. Elles ne prennent jamais un
-- user_id fourni par le client : l'identité vient uniquement de auth.uid().
CREATE OR REPLACE FUNCTION public.is_active_atelier_member(p_atelier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = p_atelier_id
      AND m.user_id = (SELECT auth.uid())
      AND m.actif
  );
$;

CREATE OR REPLACE FUNCTION public.is_active_atelier_owner(p_atelier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = p_atelier_id
      AND m.user_id = (SELECT auth.uid())
      AND m.actif
      AND m.role = 'proprietaire'
  );
$;

REVOKE ALL ON FUNCTION public.is_active_atelier_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_atelier_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_atelier_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_atelier_owner(uuid) TO authenticated;

-- Un atelier est créé par un utilisateur authentifié; created_by ne peut pas
-- être attribué à quelqu'un d'autre et ne peut pas être modifié après création.
CREATE POLICY atelier_select_member_or_creator ON public.atelier
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT public.is_active_atelier_member(atelier.id))
  );

CREATE POLICY atelier_insert_self ON public.atelier
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND created_by = (SELECT auth.uid()));

CREATE POLICY atelier_update_member ON public.atelier
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_active_atelier_owner(atelier.id)))
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR (SELECT public.is_active_atelier_owner(atelier.id))
  );

-- La lecture de l'atelier par son créateur avant sa première appartenance est
-- nécessaire pour éviter un blocage circulaire lors de l'inscription initiale.
-- Un utilisateur ne lit que ses propres appartenances. La première appartenance
-- doit être propriétaire de l'atelier qu'il vient de créer. Les propriétaires
-- existants peuvent ajouter des membres de rôle non-propriétaire.
CREATE POLICY atelier_membre_select_self_or_owner ON public.atelier_membre
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_active_atelier_owner(atelier_membre.atelier_id))
  );

CREATE POLICY atelier_membre_insert_owner_or_invited_member ON public.atelier_membre
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND role = 'proprietaire'
      AND actif = true
      AND EXISTS (
        SELECT 1 FROM public.atelier a
        WHERE a.id = atelier_id AND a.created_by = (SELECT auth.uid())
      )
    )
    OR
    (
      role IN ('gestionnaire', 'employe')
      AND (SELECT public.is_active_atelier_owner(atelier_membre.atelier_id))
    )
  );

-- Les données métier ne sont accessibles qu'aux membres actifs de leur atelier.
CREATE POLICY client_member_access ON public.client
  FOR ALL TO authenticated
  USING ((SELECT public.is_active_atelier_member(client.atelier_id)))
  WITH CHECK ((SELECT public.is_active_atelier_member(client.atelier_id)));

CREATE POLICY mensuration_member_access ON public.mensuration
  FOR ALL TO authenticated
  USING ((SELECT public.is_active_atelier_member(mensuration.atelier_id)))
  WITH CHECK ((SELECT public.is_active_atelier_member(mensuration.atelier_id)));

CREATE POLICY commande_member_access ON public.commande
  FOR ALL TO authenticated
  USING ((SELECT public.is_active_atelier_member(commande.atelier_id)))
  WITH CHECK ((SELECT public.is_active_atelier_member(commande.atelier_id)));

-- Paiements : le navigateur peut lire et ajouter des événements, jamais les
-- réécrire ou les effacer. Les remboursements/corrections exigeront une fonction
-- dédiée et auditée avant d'activer ce parcours dans l'interface.
CREATE POLICY paiement_member_select ON public.paiement
  FOR SELECT TO authenticated
  USING ((SELECT public.is_active_atelier_member(paiement.atelier_id)));

CREATE POLICY paiement_member_insert ON public.paiement
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.atelier_membre m
      WHERE m.atelier_id = paiement.atelier_id
        AND m.user_id = (SELECT auth.uid()) AND m.actif
    )
  );

COMMIT;

-- Contrôles à faire dans un projet Supabase de développement avant tout pilote :
-- 1. Deux utilisateurs de deux ateliers distincts : SELECT/UPDATE/DELETE croisés refusés.
-- 2. Refus de modifier atelier_id pour déplacer une ligne vers un autre atelier.
-- 3. Refus pour anon, utilisateur non connecté, membre inactif et utilisateur étranger.
-- 4. Création de l'atelier puis de la première appartenance propriétaire.
-- 5. Vérification que les tables sont exposées comme prévu dans les réglages Data API.
-- 6. Exécuter les advisors Supabase et corriger chaque avertissement pertinent.
-- 7. Tester l'ensemble sur un projet de développement dédié; ne pas utiliser Dekk Food.
