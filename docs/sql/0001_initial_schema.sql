-- YÉRÉ Atelier — brouillon de schéma PostgreSQL neutre fournisseur
-- À relire et adapter avant exécution. Ce fichier n'est PAS une migration appliquée.
-- Ne pas exécuter en production et ne pas y connecter de données réelles.
-- Prérequis : PostgreSQL 13+ (gen_random_uuid()).
-- L'authentification et les politiques d'autorisation/RLS sont volontairement séparées :
-- ce schéma seul ne sécurise PAS l'accès aux données.

BEGIN;

CREATE TABLE atelier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL CHECK (length(trim(nom)) BETWEEN 1 AND 120),
  telephone text,
  ville text,
  devise text NOT NULL DEFAULT 'XOF' CHECK (devise = 'XOF'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE atelier_membre (
  atelier_id uuid NOT NULL REFERENCES atelier(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('proprietaire', 'gestionnaire', 'employe')),
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (atelier_id, user_id)
);
CREATE INDEX atelier_membre_user_active_idx
  ON atelier_membre(user_id, actif, atelier_id);

CREATE TABLE client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id uuid NOT NULL REFERENCES atelier(id) ON DELETE RESTRICT,
  nom text NOT NULL CHECK (length(trim(nom)) BETWEEN 1 AND 160),
  telephone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atelier_id, id)
);
CREATE INDEX client_atelier_nom_idx ON client(atelier_id, lower(nom));
CREATE INDEX client_atelier_telephone_idx ON client(atelier_id, telephone);

CREATE TABLE mensuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id uuid NOT NULL,
  client_id uuid NOT NULL,
  date_mesure date NOT NULL,
  valeurs jsonb NOT NULL CHECK (jsonb_typeof(valeurs) = 'object'),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atelier_id, id),
  FOREIGN KEY (atelier_id, client_id)
    REFERENCES client(atelier_id, id) ON DELETE RESTRICT
);
CREATE INDEX mensuration_client_date_idx
  ON mensuration(atelier_id, client_id, date_mesure DESC);

CREATE TABLE commande (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id uuid NOT NULL,
  client_id uuid NOT NULL,
  reference text NOT NULL,
  vetement text NOT NULL CHECK (length(trim(vetement)) BETWEEN 1 AND 200),
  date_commande date NOT NULL DEFAULT CURRENT_DATE,
  date_livraison date,
  statut text NOT NULL DEFAULT 'a_preparer'
    CHECK (statut IN ('a_preparer', 'en_confection', 'pret', 'livre', 'annule')),
  prix_fcfa bigint NOT NULL CHECK (prix_fcfa >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atelier_id, id),
  UNIQUE (atelier_id, reference),
  FOREIGN KEY (atelier_id, client_id)
    REFERENCES client(atelier_id, id) ON DELETE RESTRICT,
  CHECK (date_livraison IS NULL OR date_livraison >= date_commande)
);
CREATE INDEX commande_atelier_statut_date_idx
  ON commande(atelier_id, statut, date_livraison);

-- Les paiements sont un journal d'événements : le prix de commande et l'acompte
-- ne sont pas des preuves d'encaissement. Une correction se fait par annulation
--/contre-écriture traçable, jamais par modification silencieuse du montant.
CREATE TABLE paiement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atelier_id uuid NOT NULL,
  commande_id uuid NOT NULL,
  montant_fcfa bigint NOT NULL CHECK (montant_fcfa > 0),
  date_paiement timestamptz NOT NULL DEFAULT now(),
  statut text NOT NULL DEFAULT 'confirme'
    CHECK (statut IN ('confirme', 'annule')),
  cle_idempotence text NOT NULL CHECK (length(trim(cle_idempotence)) BETWEEN 8 AND 200),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atelier_id, id),
  UNIQUE (atelier_id, cle_idempotence),
  FOREIGN KEY (atelier_id, commande_id)
    REFERENCES commande(atelier_id, id) ON DELETE RESTRICT
);
CREATE INDEX paiement_commande_date_idx
  ON paiement(atelier_id, commande_id, date_paiement DESC);

COMMIT;

-- À implémenter avant usage :
-- 1) l'identité user_id doit provenir du fournisseur d'authentification, jamais du formulaire client.
-- 2) autorisation stricte sur chaque lecture/écriture via appartenance active à atelier_membre.
-- 3) RLS/politiques équivalentes pour toutes les tables et toutes les sous-ressources.
-- 4) validation des transitions de statut, interdiction de modifier/supprimer un paiement confirmé,
--    procédure d'annulation traçable et rapprochement du solde.
-- 5) migrations, tests négatifs inter-ateliers, sauvegarde et restauration vérifiées.
-- 6) définir les règles de confidentialité, rétention, export et suppression.
