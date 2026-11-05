# YÉRÉ

**La couture, mieux organisée.**

YÉRÉ est une application web mobile-first destinée aux ateliers de tailleurs, avec un espace Market public pour découvrir les annonces. L'application réunit la gestion de l'atelier, de l'équipe et des activités commerciales dans une interface pensée pour le téléphone.

## État du produit

Les modules applicatifs comprennent :
- clients et mensurations historisées ;
- commandes, suivi de confection et paiements ;
- caisse et dépenses, avec accès financier réservé au propriétaire ;
- stock, mouvements, fournisseurs et achats fournisseurs ;
- équipe, invitations et tâches d'atelier ;
- Market public, avec le catalogue affiché dès l'arrivée sur l'accueil ;
- présentation de l'abonnement atelier, placée directement sous le catalogue Market.

L'abonnement prévu est de deux mois gratuits, puis 5 000 FCFA par mois et par atelier, pour toute l'équipe. Les opérations de paiement réel et l'activation commerciale doivent être considérées comme non validées tant qu'un test complet auprès du prestataire n'a pas été réalisé.

## Architecture actuelle

- **Frontend :** React 18, TypeScript et Vite.
- **Authentification et données métier :** Supabase Auth et PostgreSQL.
- **Hébergement :** site statique Render, dépôt GitHub `aydiarra-star/yere`, branche `main`.
- **URL officielle :** https://yere-main-preview.onrender.com
- **Projet Supabase :** `yere` (ID `anphzspjnnhzcqzwhpsg`), région `eu-west-3`.

Supabase est la source opérationnelle des données d'atelier synchronisées : clients, mensurations, commandes, paiements, dépenses, stock, fournisseurs, achats fournisseurs, membres, invitations et tâches. Le navigateur peut conserver des éléments locaux de fonctionnement ou d'archive ; ces archives locales ne remplacent pas les données serveur et ne doivent pas être réinjectées automatiquement dans l'atelier actif.

## Accès, rôles et isolation

Les rôles métier sont :
- **Propriétaire :** contrôle de son atelier, de l'équipe et des données financières.
- **Gestionnaire :** gestion opérationnelle selon les permissions définies.
- **Employé / tailleur :** accès aux informations nécessaires au travail et aux tâches autorisées.

Les données sont protégées par les politiques PostgreSQL Row Level Security (RLS). Lors du dernier audit, 24 tables du schéma public avaient RLS activé. Cela ne suffit pas à prouver à lui seul l'isolation complète : les scénarios avec plusieurs comptes et plusieurs ateliers doivent continuer à être testés.

Les informations de caisse et les autres données financières doivent rester réservées au propriétaire. Les vérifications automatisées ne remplacent pas les essais manuels de connexion, d'invitation, de changement d'atelier et de permissions sur des comptes de test isolés.

## Développement et CI

Prérequis : Node.js 20 ou supérieur et npm.

```bash
npm ci
npm test
npm run build
```

Le build exécute également `scripts/verify-build.mjs` en postbuild. Ce contrôle vérifie les illustrations requises.

La CI GitHub exécute l'audit des dépendances, les tests unitaires et le build. Le dernier contrôle consulté sur le commit `923576733baf404a87baab9ef04d98c8f72507c5` a réussi pour ces trois étapes.

## Déploiement officiel

Le service Render officiel est `srv-dbguo8vf3r2c73amvbmg`, relié au dépôt `aydiarra-star/yere` et à la branche `main`. Il publie le dossier `dist` à l'adresse :

https://yere-main-preview.onrender.com

Après chaque déploiement, vérifier le commit réellement déployé, le statut `live`, les journaux disponibles et les parcours touchés par les changements. Un déploiement réussi ne prouve pas que tous les parcours métier fonctionnent.

## Contrôles avant ouverture commerciale

Poursuivre les essais avec des comptes de test et un environnement isolé :
- création de compte, connexion, déconnexion et récupération du mot de passe ;
- création d'atelier et reconnexion sur un autre appareil ;
- invitation, acceptation, refus et révocation d'accès ;
- création d'un client, ajout de plusieurs mensurations et historique ;
- création et suivi d'une commande, avec acompte et paiements partiels ;
- vérification que caisse, dépenses, soldes et achats fournisseurs restent réservés au propriétaire ;
- dépenses, annulations motivées, stock, mouvements et achats fournisseurs ;
- attribution de tâches et suivi par les membres de l'équipe ;
- impossibilité pour un compte d'un autre atelier d'accéder aux données ;
- Market : affichage public, détail des annonces, images, inscription acheteur et contact vendeur ;
- abonnement et parcours PayTech en environnement de test, puis validation séparée avant tout paiement réel.

Ne jamais créer de fausses données clients dans les ateliers réels.

## Sécurité, sauvegardes et limites connues

Les points suivants restent à suivre et ne doivent pas être présentés comme validés :
- la restauration complète d'une sauvegarde Supabase n'a pas encore été testée dans un environnement isolé ;
- six alertes concernant des fonctions `SECURITY DEFINER` nécessitent une revue individuelle de leur code, de leurs contrôles d'accès et de leurs droits d'exécution ;
- la protection Supabase contre les mots de passe compromis était signalée désactivée lors du dernier audit ; son activation nécessite une décision et une vérification dédiées ;
- la validation visuelle des logos de paiement, notamment le logo original Wave, reste à confirmer ;
- les essais réels de bout en bout sur les parcours d'authentification, de permissions, de Market et de paiement restent nécessaires.

Ne jamais tester une restauration sur la base de production. Ne jamais vider le stockage du navigateur pour résoudre un problème sans avoir vérifié et sauvegardé les éléments locaux à préserver.

## Documentation du projet

- [Prompt maître](docs/PROMPT_MAITRE.md)
- [Cahier des charges maître](docs/CAHIER_DES_CHARGES_MAITRE.md)
- [Feuille de route](docs/FEUILLE_DE_ROUTE.md)
- [Backlog MVP](docs/BACKLOG_MVP.md)
- [Décision d'architecture](docs/DECISION_ARCHITECTURE.md)
- [Modèle de données MVP](docs/MODELE_DONNEES_MVP.md)
- [Plan de persistance serveur et sécurité](docs/PLAN_PERSISTENCE_ET_SECURITE.md)
- [Charte graphique](docs/CHARTE_GRAPHIQUE.md)
- [Plan du mode hors ligne](docs/PLAN_MODE_HORS_LIGNE.md)

## Principes de maintenance

- Préserver les données et les fonctionnalités déjà en place.
- Privilégier les corrections ciblées et les tests de non-régression.
- Garder une interface simple, lisible et responsive sur téléphone.
- Maintenir l'isolation stricte entre ateliers et la confidentialité financière.
- Ne jamais annoncer une fonctionnalité comme opérationnelle sans vérification.
