# Décision d'architecture — proposition à valider

**Statut :** proposition provisoire, pas encore une décision technique définitive.  
**Date :** 2026-10-27  
**Contexte :** le dépôt audité contient un README et la documentation produit, mais aucun manifeste applicatif identifié (pas de `package.json`, `pyproject.toml`, configuration de framework ou migration de base trouvée sur la branche de référence consultée).

## Objectif

Livrer rapidement une première application utilisable par les tailleurs, tout en protégeant les données privées et en laissant une voie d'évolution vers les fournisseurs et la marketplace.

## Option recommandée pour le MVP

- **Application web responsive installable (PWA)** : un seul produit accessible par lien sur téléphone et ordinateur, sans imposer le téléchargement d'une application native dès le départ.
- **TypeScript + React avec un framework adapté au rendu serveur et aux formulaires** : réutilisation des composants et possibilité d'ajouter des pages publiques de marketplace plus tard.
- **PostgreSQL managé** pour les données relationnelles : clients, mensurations, commandes, paiements et stocks.
- **Authentification éprouvée et contrôle d'accès côté serveur/base de données** ; chaque enregistrement privé doit être associé à un atelier.
- **Tests automatisés** : tests unitaires sur les règles financières et tests d'intégration sur l'isolation des données; tests de parcours navigateur avant pilote.
- **Déploiement et sauvegardes documentés**, avec environnements séparés et aucun secret dans le dépôt.

## Pourquoi cette option

1. Les premiers écrans sont des formulaires et tableaux de gestion, adaptés à une application web responsive.
2. Les tailleurs peuvent commencer depuis un lien et l'installer sur l'écran d'accueil si le navigateur le permet.
3. Les données sont relationnelles : une base SQL convient aux liens entre ateliers, clients, mesures, commandes et paiements.
4. Une marketplace peut être ajoutée ensuite sans obliger tous les tailleurs à utiliser la vitrine.
5. Une PWA ne garantit pas automatiquement un vrai mode hors connexion. Cette fonction doit être spécifiée et testée séparément.

## Décisions à confirmer avant d'écrire l'application

- Le propriétaire valide-t-il une application web/PWA comme première plateforme ?
- Quel hébergement est disponible et quel budget mensuel est acceptable ?
- Une base et un projet d'authentification existent-ils déjà ?
- Quel navigateur et quels téléphones faut-il supporter en priorité ?
- Faut-il autoriser plusieurs employés par atelier dès le MVP, ou commencer par un compte propriétaire ?
- Quel degré d'usage hors connexion est réellement indispensable ?

## Garde-fous de sécurité

- Ne pas mettre de clé privilégiée dans le navigateur ou dans une variable publique.
- Ne pas faire confiance aux rôles déclarés par l'utilisateur dans des métadonnées modifiables.
- Chaque lecture, modification et suppression doit être autorisée côté serveur/base de données.
- Si Supabase est retenu, activer et tester les politiques RLS sur toutes les tables exposées; une règle « utilisateur connecté » seule ne suffit pas : il faut aussi vérifier l'appartenance à l'atelier.
- Ne pas considérer un test de sécurité réussi sans l'avoir exécuté contre un environnement de test.
- Ne pas créer ni migrer une base de production sans accès et autorisation explicites.

## Décision finale

Ne pas installer de dépendances ni générer une application avant d'avoir vérifié les contraintes ci-dessus et choisi explicitement la stack. Cette proposition sert de base à la décision, pas de preuve que l'application existe.
