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

La compilation ne met pas elle-même à jour un site déjà hébergé. Ce dépôt ne définit pas de service de déploiement automatique : il faut déployer `dist/` auprès de l’hébergeur utilisé pour YÉRÉ.

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
