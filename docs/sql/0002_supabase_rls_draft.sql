-- YÉRÉ Atelier — politiques RLS de base pour Supabase
-- DOCUMENT DE TRAVAIL : non appliqué à une base et non validé en environnement Supabase.
-- À appliquer uniquement après revue, sur un projet YÉRÉ dédié et vide/de développement.
-- Pré-requis : docs/sql/0001_initial_schema.sql appliqué.
--
-- Modèle d'accès :
-- * l'identité vient uniquement de auth.uid();
-- * chaque donnée métier est isolée par atelier_id + appartenance active;
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
GRANT SELECT, INSERT, UPDATE ON public.atelier TO authenticated;
GRANT SELECT, INSERT ON public.atelier_membre TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensuration TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commande TO authenticated;
GRANT SELECT, INSERT ON public.paiement TO authenticated;
REVOKE ALL ON public.atelier, public.atelier_membre, public.client,
  public.mensuration, public.commande, public.paiement FROM anon;
REVOKE UPDATE, DELETE ON public.paiement FROM authenticated;

-- Un atelier est créé par un utilisateur authentifié; created_by ne peut pas
-- être attribué à quelqu'un d'autre et ne peut pas être modifié après création.
CREATE POLICY atelier_select_member ON public.atelier
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = atelier.id
      AND m.user_id = (SELECT auth.uid())
      AND m.actif
  ));

CREATE POLICY atelier_insert_self ON public.atelier
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND created_by = (SELECT auth.uid()));

CREATE POLICY atelier_update_member ON public.atelier
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = atelier.id
      AND m.user_id = (SELECT auth.uid())
      AND m.actif
      AND m.role = 'proprietaire'
  ))
  WITH CHECK (created_by = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = atelier.id
      AND m.user_id = (SELECT auth.uid())
      AND m.actif
      AND m.role = 'proprietaire'
  ));

-- Un utilisateur ne lit que ses propres appartenances. La première appartenance
-- doit être propriétaire de l'atelier qu'il vient de créer. Les propriétaires
-- existants peuvent ajouter des membres de rôle non-propriétaire.
CREATE POLICY atelier_membre_select_self ON public.atelier_membre
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

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
      AND EXISTS (
        SELECT 1 FROM public.atelier_membre owner_membership
        WHERE owner_membership.atelier_id = atelier_membre.atelier_id
          AND owner_membership.user_id = (SELECT auth.uid())
          AND owner_membership.role = 'proprietaire'
          AND owner_membership.actif
      )
    )
  );

-- Les données métier ne sont accessibles qu'aux membres actifs de leur atelier.
CREATE POLICY client_member_access ON public.client
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = client.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = client.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ));

CREATE POLICY mensuration_member_access ON public.mensuration
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = mensuration.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = mensuration.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ));

CREATE POLICY commande_member_access ON public.commande
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = commande.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = commande.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ));

-- Paiements : le navigateur peut lire et ajouter des événements, jamais les
-- réécrire ou les effacer. Les remboursements/corrections exigeront une fonction
-- dédiée et auditée avant d'activer ce parcours dans l'interface.
CREATE POLICY paiement_member_select ON public.paiement
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atelier_membre m
    WHERE m.atelier_id = paiement.atelier_id
      AND m.user_id = (SELECT auth.uid()) AND m.actif
  ));

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
