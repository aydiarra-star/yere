# YÉRÉ

**La couture, mieux organisée.**

YÉRÉ est conçu d’abord et exclusivement pour les tailleurs au Sénégal : clients, mensurations, commandes, confection, paiements, caisse, dépenses et stocks. Les autres métiers de la mode et la marketplace sont hors du périmètre du lancement.

## Version applicative en chantier — YÉRÉ Atelier

Le premier socle est une application web React + TypeScript + Vite, conçue mobile-first. Au premier lancement, l’accueil affiche un **aperçu fictif** clairement identifié (aucune de ces valeurs d’exemple n’est enregistrée). Configurez l’atelier ou créez un premier client pour afficher les données réelles, initialement vides. Cette version permet de parcourir les fonctions disponibles pour l'atelier :
- tableau de bord alimenté par les données saisies dans l'application ;
- recherche de clients par nom ou téléphone ;
- création de fiches client conservées dans le stockage local du navigateur ;
- édition des mensurations et notes client, conservées localement ;
- commandes, statut de confection et calcul du reste dû en FCFA ;

**Limites importantes :** les données saisies sont conservées uniquement dans le stockage local de ce navigateur ; aucune authentification réelle, base de données serveur, sauvegarde distante ou isolation multi-atelier n'est encore intégrée. L'export JSON et la restauration locale sont disponibles, mais ne remplacent pas une sauvegarde serveur. N'utilisez pas encore de données réelles de clients. Cette version n'est pas prête pour la production.

### Démarrer en local

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run dev
```

### Compiler et publier les illustrations

```bash
npm ci
npm run build
```

Publiez **tout le contenu** du dossier `dist/`, y compris `images/`, `manifest.webmanifest` et `sw.js` ; publier seulement le JavaScript ne suffit pas. Le build utilise des chemins relatifs afin de fonctionner à la racine d’un domaine ou dans un sous-dossier. Les illustrations et la page sont mises en cache lors de l’installation, avec une mise à jour réseau pour éviter de conserver une ancienne version.

La commande `npm run build` contrôle automatiquement que les quatre images sont présentes dans `dist/`, référencées par l’application et prévues pour le cache. On peut relancer ce contrôle seul avec `npm run verify:build`.

### Préparation pour Render (déploiement non effectué)

Le fichier `render.yaml` propose **un site statique optionnel**, mais ne prouve pas qu’un site est déployé. Si un Blueprint est connecté à une branche, sa synchronisation peut appliquer les changements et déclencher un déploiement : examinez ses effets avant de l’activer. `.node-version` fixe la version Node utilisée si le service ne définit pas déjà `NODE_VERSION`. La configuration locale proposée est ([référence officielle des Blueprints Render](https://render.com/docs/blueprint-spec)) :

- dépôt : `aydiarra-star/yere` et branche contenant ce correctif (sur `main` après intégration) ;
- racine du projet : racine du dépôt ;
- commande de build : `npm ci --include=dev && npm test && npm run build` ;
- répertoire à publier : `dist` ;
- en-têtes `Cache-Control: no-store` pour l’accueil, `sw.js`, le manifeste et les illustrations, afin de ne pas retenir une version périmée.

**Si un service Render existe déjà**, vérifiez d’abord son type, sa branche, son répertoire racine, ses domaines, ses variables et son mode de déploiement. Si c’est déjà un *Static Site*, ses réglages peuvent être corrigés dans le tableau de bord sans créer une copie. N’associez pas le Blueprint à un service existant et ne changez pas son type sans examiner la liste des changements proposés : sa synchronisation peut modifier les réglages. Le nom `yere-atelier` est indicatif pour un éventuel nouveau Blueprint ; il n’identifie pas nécessairement votre service actuel.

Après un déploiement **effectivement terminé**, vérifiez le commit affiché dans les journaux Render, puis ouvrez l’accueil et les URL `/images/delivery-reference.webp`, `/images/payment-reference.webp` et `/images/production-reference.webp` sur le domaine du site : elles doivent renvoyer des images WebP, et non une page HTML. Vérifiez ensuite l’affichage dans l’application en ligne. N’effacez pas les données du site et ne désinstallez pas l’application pour forcer la mise à jour sans avoir d’abord exporté les données locales : cela pourrait supprimer les fiches clients et commandes de ce navigateur.

### Vérifications

```bash
npm test
npm run build
```

Ces commandes doivent être exécutées dans un environnement Node avant de considérer les tests et la compilation comme validés.

## Priorités produit
1. **YÉRÉ Atelier** — clients, mensurations historisées, commandes et production.
2. **Gestion financière** — acomptes, soldes, recettes, dépenses, dettes/créances.
3. **Stocks et achats** — fournitures, consommables et fournisseurs.
4. **Pilote terrain** — accompagnement porte-à-porte, retours et amélioration de l'expérience mobile.
5. **Évolutions futures** — fournisseurs et marketplace uniquement après validation du cœur de gestion des tailleurs.

## Documentation
- [Prompt maître](docs/PROMPT_MAITRE.md)
- [Cahier des charges maître](docs/CAHIER_DES_CHARGES_MAITRE.md)
- [Feuille de route](docs/FEUILLE_DE_ROUTE.md)
- [Backlog MVP](docs/BACKLOG_MVP.md)
- [Analyse concurrentielle et différenciation](docs/ANALYSE_CONCURRENTIELLE_ET_DIFFERENCIATION.md)
- [Décision d'architecture](docs/DECISION_ARCHITECTURE.md)
- [Modèle de données MVP](docs/MODELE_DONNEES_MVP.md)
- [Plan de persistance serveur et sécurité](docs/PLAN_PERSISTENCE_ET_SECURITE.md)
- [Charte graphique bleu et blanc](docs/CHARTE_GRAPHIQUE.md)
- [Plan du mode hors ligne et critères de vérification](docs/PLAN_MODE_HORS_LIGNE.md)

## Principes
- Produit mobile d'abord, simple à apprendre et utile dès la première utilisation.
- Sécurité, confidentialité et isolation stricte des données entre ateliers.
- Pas de promesse fonctionnelle sans vérification.
- La marketplace ne doit pas retarder la gestion quotidienne des tailleurs.
