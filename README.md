# YÉRÉ

**La couture, mieux organisée.**

YÉRÉ commence par aider les tailleurs et ateliers de couture au Sénégal à gérer leurs clients, mensurations, commandes, étapes de confection, paiements, caisse, dépenses et stocks. L'intégration des fournisseurs viendra ensuite, puis une marketplace facultative dans une phase ultérieure.

## Prototype applicatif — YÉRÉ Atelier

Le premier socle est une application web React + TypeScript + Vite, conçue mobile-first. Cette branche contient un prototype interactif pour explorer le parcours atelier :
- tableau de bord et indicateurs de démonstration ;
- recherche de clients par nom ou téléphone ;
- création de fiches client conservées dans le stockage local du navigateur ;
- édition des mensurations et notes client, conservées localement ;
- commandes, statut de confection et calcul du reste dû en FCFA.

**Limites importantes :** les données de démonstration et les modifications sont conservées uniquement dans le stockage local de ce navigateur ; aucune authentification, base de données, sauvegarde serveur ou isolation multi-atelier n'est encore intégrée. Ne saisissez aucune donnée réelle de client. Ce prototype n'est pas prêt pour la production.

### Démarrer en local

Prérequis : Node.js 20+ et npm.

```bash
npm install
npm run dev
```

### Vérifications

```bash
npm test
npm run build
```

Ces commandes doivent être exécutées dans un environnement Node avant de considérer les tests et la compilation comme validés.

## Priorités produit
1. **YÉRÉ Atelier** — clients, mensurations historisées, commandes et production.
2. **Gestion financière** — acomptes, soldes, recettes, dépenses et caisse.
3. **Stocks et achats** — fournitures, consommables et fournisseurs.
4. **Pilote terrain** — accompagnement porte-à-porte, retours et bouche-à-oreille.
5. **YÉRÉ Fournisseurs**, puis **YÉRÉ Market** — après validation du cœur de gestion.

## Documentation
- [Prompt maître](docs/PROMPT_MAITRE.md)
- [Cahier des charges maître](docs/CAHIER_DES_CHARGES_MAITRE.md)
- [Feuille de route](docs/FEUILLE_DE_ROUTE.md)
- [Décision d'architecture](docs/DECISION_ARCHITECTURE.md)
- [Backlog MVP](docs/BACKLOG_MVP.md)
- [Plan pilote terrain](docs/PLAN_PILOTE_TERRAIN.md)
- [Modèle de données MVP](docs/MODELE_DONNEES_MVP.md)
- [Plan de persistance serveur et sécurité](docs/PLAN_PERSISTENCE_ET_SECURITE.md)
- [Charte graphique bleu et blanc](docs/CHARTE_GRAPHIQUE.md)
- [Plan du mode hors ligne et critères de vérification](docs/PLAN_MODE_HORS_LIGNE.md)

## Principes
- Produit mobile d'abord, simple à apprendre et utile dès la première utilisation.
- Sécurité, confidentialité et isolation stricte des données entre ateliers.
- Pas de promesse fonctionnelle sans vérification.
- La marketplace ne doit pas retarder la gestion quotidienne des tailleurs.
