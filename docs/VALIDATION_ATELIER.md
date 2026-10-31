# Validation avant pilote

Le projet Supabase dédié à YÉRÉ existe déjà et contient le socle de données installé. Cette checklist concerne maintenant la validation fonctionnelle et de sécurité avant le pilote ; elle ne demande pas de recréer le projet ni de réappliquer les migrations.

## État vérifié le 31 octobre 2026

- Projet Supabase : `yere` (région `eu-west-3`).
- 31 migrations enregistrées.
- 15 tables publiques, toutes avec RLS activé.
- 41 politiques RLS.
- 2 comptes Auth, 2 ateliers et 3 appartenances présentes dans la base.
- Aucune donnée réelle de clients ne doit être utilisée pendant les tests.

## Contrôles restant à exécuter

- Un utilisateur non connecté ne lit ni n'écrit de données privées.
- Un membre d'un atelier ne peut pas consulter ou modifier les données d'un autre atelier.
- Seuls les rôles autorisés peuvent enregistrer un acompte et accéder aux données financières.
- Les montants et l'appartenance du client sont vérifiés côté serveur.
- Les requêtes répétées ne créent pas de doublons.
- Les invitations sont visibles par le destinataire, acceptables ou refusables, et limitées au bon atelier.
- Les règles d'accès sont testées avec des comptes de chaque rôle, pas avec un compte administrateur.

## Configuration applicative à vérifier

- Le déploiement YÉRÉ doit disposer de `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Vérifier que ces variables pointent vers le projet YÉRÉ, jamais vers JotColis ou Dekk Food.
- Le dépôt contient déjà le flux d'authentification et les appels REST Supabase ; le contrôle porte sur leur configuration et leur validation de bout en bout.

## Passage au pilote

Consigner les résultats des tests, corriger chaque échec et examiner les alertes de sécurité avant tout déploiement ou import de données réelles. Ne pas appliquer de migration supplémentaire sans vérifier d'abord qu'elle n'est pas déjà enregistrée dans le projet.
