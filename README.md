# YÉRÉ

**La couture, mieux organisée.**

YÉRÉ est une application web mobile-first destinée aux ateliers de tailleurs au Sénégal. Son cœur métier couvre les clients, les mensurations, les commandes, le suivi de confection, les paiements, la caisse, les dépenses, les stocks, les achats fournisseurs et l'organisation du travail en équipe.

La marketplace est une évolution séparée : elle ne doit pas retarder la gestion quotidienne de l'atelier.

## Architecture actuelle

- **Frontend :** React 18, TypeScript et Vite.
- **Authentification et données :** Supabase Auth et PostgreSQL via l'API Supabase.
- **Hébergement :** site statique Render, dépôt GitHub `aydiarra-star/yere`, branche `main`.
- **URL du service :** https://yere-main-preview.onrender.com
- **Région Supabase :** `eu-west-3` (Europe).

Les données métier principales sont synchronisées avec Supabase : clients, mensurations, commandes, paiements, dépenses, stock, fournisseurs, achats fournisseurs, membres, invitations et tâches d'atelier. Les données financières sont chargées à travers des fonctions RPC contrôlées côté base ; l'interface masque les informations financières aux rôles qui ne doivent pas y accéder.

## Authentification, rôles et isolation

L'accès aux données est protégé par les politiques PostgreSQL Row Level Security (RLS). À la dernière vérification de la base de production, les 17 tables du schéma public avaient RLS activé et des politiques associées.

Les rôles métier sont :
- **Propriétaire :** contrôle complet de son atelier, de l'équipe et des données financières.
- **Gestionnaire :** gestion opérationnelle selon les permissions définies, sans accès aux données financières réservées au propriétaire.
- **Employé / tailleur :** accès aux informations nécessaires au travail et aux tâches qui lui sont attribuées, selon les règles de l'atelier.

Les fonctions privilégiées utilisées pour certaines opérations sensibles sont placées dans le schéma non exposé `private`, avec des contrôles d'identité et de rôle. Les fonctions RPC exposées dans `public` sont réservées au rôle authentifié ; l'accès anonyme aux RPC métier a été contrôlé.

**Important :** l'activation de RLS et la présence de politiques ne remplacent pas les essais réels avec plusieurs comptes. Avant une ouverture commerciale large, exécuter les scénarios d'acceptation décrits plus bas.

## Persistance locale et précautions

Le navigateur conserve également un cache local isolé par utilisateur et par atelier pour certaines données, ainsi que des données de compatibilité héritées. Le serveur reste la source distante pour les opérations métier synchronisées, mais toutes les préférences et fonctions périphériques ne sont pas encore centralisées.

- Les données de marketplace et certaines informations d'onboarding restent locales au navigateur.
- Des enregistrements hérités identifiés par leurs anciens préfixes peuvent encore être conservés localement lors de la synchronisation.
- Le cache local ne constitue **pas** une sauvegarde serveur.

**Ne videz pas les données du navigateur et ne désinstallez pas l'application pour forcer une mise à jour sans avoir d'abord exporté et vérifié les données locales.** Cela pourrait supprimer des éléments hérités qui ne sont pas encore présents sur le serveur.

## Développement et vérifications

Prérequis : Node.js 20 ou supérieur et npm.

```bash
npm ci
npm test
npm run build
```

Le build lance également `scripts/verify-build.mjs` en postbuild. Ce contrôle vérifie la présence, les références et la mise en cache des quatre illustrations requises.

La CI GitHub exécute l'audit des dépendances, les tests et le build. L'installation reproductible utilise `npm ci` avec le lockfile versionné.

## Déploiement Render

Le service statique Render existant est `yere-main-preview`, relié au dépôt `aydiarra-star/yere` et à la branche `main`, avec publication du dossier `dist` et déploiement automatique sur commit.

Commande de build recommandée pour ce dépôt :

```bash
npm ci && npm test && npm run build
```

Répertoire de publication : `dist`.

Après chaque déploiement, contrôler :
1. le commit réellement déployé et le statut `live` ;
2. les journaux de build et les erreurs d'exécution ;
3. l'accueil de l'application ;
4. les ressources `/images/delivery-reference.webp`, `/images/payment-reference.webp` et `/images/production-reference.webp` ;
5. l'authentification et les parcours métier avec des comptes de test.

## Contrôles de mise en service

Avant de déclarer l'application pleinement prête pour tous les ateliers, effectuer les essais de bout en bout avec des comptes distincts :
- création de compte, connexion, déconnexion et récupération du mot de passe ;
- création d'atelier et accès après reconnexion sur un autre appareil ;
- invitation, réception dans la boîte de réception de l'application, acceptation et refus ;
- création d'un client, ajout de plusieurs mensurations et historique ;
- création d'une commande avec et sans acompte selon le rôle ;
- ajout de paiement, calcul du solde et visibilité financière réservée au propriétaire ;
- dépenses, annulation motivée, stock, mouvements et achats fournisseurs ;
- attribution de tâches, mise à jour par le tailleur et historique ;
- impossibilité pour un compte d'un autre atelier d'accéder aux données ;
- vérification qu'un employé ne peut ni consulter ni modifier les données financières protégées.

Les contrôles automatisés et les tests SQL d'intégration sont utiles, mais ne remplacent pas ces essais dans un navigateur avec de vrais comptes de test.

## Sauvegardes et sécurité opérationnelle

Les sauvegardes de la base doivent être vérifiées dans le tableau de bord Supabase selon le plan actif. Un export local ou un contrôle de fichier chiffré n'est pas, à lui seul, la preuve qu'une restauration complète a réussi. Ne lancez jamais une restauration sur la base de production pour un simple test.

L'avis Supabase relevé lors du dernier audit indique que la protection contre les mots de passe compromis (Leaked Password Protection) est désactivée. Il est recommandé de l'activer dans les réglages Auth si cette option est disponible sur le plan utilisé. Les avis d'index inutilisés sont informatifs : ne supprimez pas ces index sans mesure et analyse de charge.

## Documentation du produit

- [Prompt maître](docs/PROMPT_MAITRE.md)
- [Cahier des charges maître](docs/CAHIER_DES_CHARGES_MAITRE.md)
- [Feuille de route](docs/FEUILLE_DE_ROUTE.md)
- [Backlog MVP](docs/BACKLOG_MVP.md)
- [Décision d'architecture](docs/DECISION_ARCHITECTURE.md)
- [Modèle de données MVP](docs/MODELE_DONNEES_MVP.md)
- [Plan de persistance serveur et sécurité](docs/PLAN_PERSISTENCE_ET_SECURITE.md)
- [Charte graphique](docs/CHARTE_GRAPHIQUE.md)
- [Plan du mode hors ligne](docs/PLAN_MODE_HORS_LIGNE.md)

## Principes

- Simplicité d'utilisation sur téléphone, y compris avec une connexion limitée.
- Confidentialité et isolation stricte entre ateliers.
- Les informations financières ne sont accessibles qu'aux rôles autorisés.
- Préserver les données existantes avant toute migration ou modification de stockage.
- Ne jamais annoncer une fonctionnalité comme opérationnelle sans vérification.
