# Décision d'architecture — audit réel et prochaine décision

**Statut :** stack cible encore à confirmer ; audit du dépôt effectué le 27 octobre 2026.
**Référence produit :** `docs/PROMPT_MAITRE.md` et `docs/CAHIER_DES_CHARGES_MAITRE.md`.

## 1. État vérifié du dépôt

- Frontend présent : React 18, TypeScript, Vite 5 ; application web responsive orientée mobile.
- Déploiement Render présent : site statique `yere-atelier-preview`, branche `feat/atelier-first-slice`, publication du dossier `dist`.
- Prototype actuel : tableau de bord, clients, mensurations, commandes et calcul du reste dû.
- Persistance actuelle : `localStorage` dans le navigateur uniquement.
- Mode hors ligne : service worker et manifeste ajoutés au code ; déploiement du commit récent et test réel en mode avion non confirmés.
- Backend API YÉRÉ, authentification, base métier, migrations et isolation multi-atelier : absents à ce stade.
- CI : le run GitHub Actions #35 associé au correctif TypeScript a réussi ; les tests unitaires et la compilation ont passé.
- Dépôt de travail : `feat/atelier-first-slice`, PR #5 ouverte en brouillon, non fusionnée.

## 2. Environnement de données audité

L'espace Supabase connecté ne présente qu'un projet nommé `Dekk Food`, actuellement inactif. **Il n'est pas identifié comme un projet YÉRÉ et ne doit pas être réutilisé pour YÉRÉ.** Aucun projet de base de données YÉRÉ n'a été confirmé.

Aucune base ni ressource de production n'a été créée ou modifiée pendant cet audit.

## 3. Architecture cible proposée pour le MVP

Conserver le frontend React + TypeScript + Vite déjà en place, plutôt que le réécrire sans preuve de nécessité. Le servir comme PWA responsive sur Render, et ajouter une persistance relationnelle PostgreSQL avec authentification et contrôle d'accès côté serveur/base de données.

**Option la plus simple à évaluer :** un projet Supabase dédié exclusivement à YÉRÉ (PostgreSQL, Auth et RLS), à condition de créer/identifier un projet YÉRÉ distinct et de vérifier les réglages actuels. L'autre option est une API TypeScript séparée sur Render devant PostgreSQL. Le choix final doit tenir compte du budget, de la facilité d'exploitation, des besoins hors ligne et des compétences disponibles ; aucun de ces backends n'est encore intégré.

### Pourquoi ne pas réécrire maintenant ?

1. Le frontend existe et la CI valide actuellement ses tests et sa compilation.
2. La priorité est de remplacer le stockage de démonstration par un modèle sécurisé, pas de refaire les écrans sans besoin démontré.
3. La séparation entre ateliers doit être vérifiée au niveau de la base ou de l'API, pas seulement dans React.
4. Un changement de framework ne résout ni l'authentification, ni l'isolation, ni les sauvegardes.

## 4. Ordre de mise en œuvre à respecter

1. Confirmer un environnement de développement dédié à YÉRÉ et le backend choisi ; ne pas utiliser Dekk Food.
2. Définir les migrations versionnées : ateliers, adhésions/roles, clients, profils de mensurations historisés, commandes, événements de statut et paiements.
3. Établir l'authentification et l'appartenance active à l'atelier.
4. Appliquer les contrôles d'accès à chaque lecture et écriture ; empêcher le changement de propriétaire `atelier_id`.
5. Ajouter des tests avec deux ateliers isolés, y compris les tentatives d'accès par identifiant direct et de déplacement d'une ligne.
6. Connecter le frontend une fonctionnalité à la fois, avec états de chargement, erreurs réseau et confirmations adaptées.
7. Tester les paiements partiels, les corrections traçables et les soldes calculés à partir des événements financiers.
8. Documenter export, sauvegarde et restauration ; effectuer un test de restauration avant toute donnée réelle.
9. Déployer sur l'environnement de prévisualisation, vérifier la version réellement servie, puis réaliser des essais hors connexion sur mobile et ordinateur.
10. Ouvrir un pilote seulement après validation des critères de sécurité et des parcours critiques.

## 5. Garde-fous obligatoires

- Ne jamais placer une clé privilégiée ou `service_role` dans le navigateur, le dépôt ou une variable publique.
- Si Supabase est retenu : RLS activé sur chaque table exposée ; politiques adaptées à l'appartenance à l'atelier, avec `USING` et `WITH CHECK` pour les mises à jour ; tests croisés entre ateliers.
- Les paiements sont des événements traçables ; pas de suppression silencieuse d'opérations financières.
- Les mensurations sont historisées ; une nouvelle prise ne détruit pas les versions précédentes.
- Aucun mode hors ligne ne doit laisser croire qu'une donnée locale a été synchronisée.
- Aucune migration destructive, base de production ou saisie de vraies données client avant validation explicite et tests de sécurité.
- Ne pas annoncer un déploiement ou une sauvegarde réussis sans preuve technique.

## 6. Blocage actuel et critère de sortie

Le travail peut continuer dans le dépôt (modèle, migrations versionnées, tests et intégration progressive), mais la connexion à une base distante sûre exige un projet YÉRÉ dédié et un choix de backend. Tant que ce projet n'existe pas ou n'est pas identifié, les données doivent rester fictives et le prototype ne doit pas être présenté comme prêt pour la production.
