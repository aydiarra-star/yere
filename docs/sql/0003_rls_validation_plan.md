# Plan de validation sécurité RLS — YÉRÉ

**Statut : plan de test, non exécuté.** À utiliser uniquement sur un projet Supabase de développement dédié à YÉRÉ, avec données fictives. Ne jamais tester ces scénarios sur Dekk Food ou sur une base de production.

## Préconditions

- [ ] Projet Supabase YÉRÉ dédié, sans données réelles.
- [ ] Appliquer d'abord `docs/sql/0001_initial_schema.sql`, puis `docs/sql/0002_supabase_rls_draft.sql`.
- [ ] Vérifier que les fonctions `is_active_atelier_member(uuid)` et `is_active_atelier_owner(uuid)` ont un propriétaire privilégié maîtrisé, `SECURITY DEFINER`, un `search_path` vide et des droits d'exécution limités.
- [ ] Créer deux utilisateurs Auth A et B; créer un atelier A pour A et un atelier B pour B.
- [ ] Exécuter les requêtes comme rôle `authenticated` avec le JWT de chaque utilisateur, pas comme rôle `postgres`.

## Scénarios obligatoires

| Scénario | Résultat attendu |
| --- | --- |
| A crée un atelier avec `created_by = auth.uid()` | Autorisé |
| A crée sa première appartenance propriétaire sur cet atelier | Autorisé |
| A lit l'atelier avant et après la première appartenance | Autorisé |
| A lit les clients, mensurations, commandes et paiements de son atelier | Autorisé |
| A tente de lire les lignes de l'atelier B | Aucune ligne de B visible |
| A tente d'insérer/modifier une ligne avec `atelier_id` de B | Refusé |
| A tente de modifier `created_by` ou de s'accorder le rôle propriétaire sur l'atelier B | Refusé |
| B tente de lire les membres de l'atelier A | Refusé, sauf si B a une appartenance légitime |
| Un propriétaire ajoute un membre `gestionnaire` ou `employe` | Autorisé |
| Un membre non-propriétaire ajoute un autre membre | Refusé |
| Un membre inactif tente d'accéder aux données métier | Refusé |
| Rôle `anon` tente de lire/écrire les six tables | Refusé |
| Un utilisateur authentifié tente UPDATE/DELETE sur `paiement` | Refusé par les privilèges SQL |
| Un utilisateur ajoute un paiement dont `created_by` n'est pas son UID | Refusé |
| Un paiement répète la même clé d'idempotence dans le même atelier | Refusé par la contrainte unique |
| Les requêtes RLS sur `atelier_membre` ne provoquent aucune erreur de récursion | Aucune erreur |

## Contrôles après application

- [ ] Vérifier les privilèges effectifs sur chaque table et fonction, notamment absence d'accès pour `anon`.
- [ ] Vérifier qu'aucune politique permissive existante ne s'ajoute aux nouvelles politiques.
- [ ] Vérifier les tables exposées dans la Data API et les réglages d'exposition du schéma.
- [ ] Exécuter les Supabase Security Advisors et traiter les avertissements pertinents.
- [ ] Tester la création de l'atelier, l'ajout du propriétaire et les lectures/écritures avec de vrais JWT de test.
- [ ] Tester une sauvegarde et une restauration avant d'envisager des données de pilote.
- [ ] Conserver les résultats, requêtes et versions de migration dans le dépôt.

## Conditions de sortie

La PR ne doit pas être considérée comme validée tant que tous les scénarios obligatoires n'ont pas été exécutés sur le projet dédié, que les résultats ne sont pas consignés et qu'une revue de sécurité n'a pas été effectuée. La réussite de la CI du dépôt ne remplace pas ces tests de base de données.
