# Feuille de route initiale — YÉRÉ

Cette feuille de route suit le prompt maître. Les coches indiquent uniquement un travail effectivement réalisé et vérifié ; le prototype local ne compte pas comme une fonctionnalité serveur sécurisée.

## État du chantier au 27 octobre 2026

- Dépôt audité : frontend React + TypeScript + Vite présent ; site statique Render configuré sur `feat/atelier-first-slice`.
- Prototype : clients, mensurations, commandes et solde de démonstration dans le navigateur ; aucune donnée réelle ne doit être saisie.
- CI : GitHub Actions #37 réussie sur le dernier commit consulté (tests unitaires et compilation).
- Mode hors ligne : code ajouté, mais déploiement du commit courant et test réel en mode avion non confirmés.
- Backend : aucun backend, compte atelier, base YÉRÉ ou isolation multi-atelier intégrés.
- Environnement : le projet Supabase connecté est « Dekk Food » (inactif), pas un projet YÉRÉ ; ne pas le réutiliser.
- PR #5 : ouverte en brouillon, non fusionnée.
- Prochaine dépendance : choisir/provisionner un environnement de développement dédié à YÉRÉ avant d'intégrer l'authentification et la persistance distante.

## Lot 0 — Établir les fondations

- [x] Inspecter le dépôt, branches, fichiers et paramètres accessibles.
- [ ] Décider et documenter la stack finale après audit (proposition documentée, décision finale encore ouverte).
- [ ] Définir l'architecture cible et les environnements ; les garde-fous et l'ordre sont documentés, mais le backend n'est pas choisi.
- [ ] Ajouter la configuration sûre et la gestion des secrets côté backend.
- [x] Définir les premiers modèles de données et la stratégie de migrations dans la documentation.
- [x] Mettre en place les tests unitaires et la CI ; dernier run consulté réussi.
- [ ] Vérifier que le déploiement Render sert le dernier commit et tester la PWA hors connexion sur mobile et ordinateur.

**Critère de sortie :** projet reproductible, testable, documenté, sans choix techniques inventés. Le lot 0 n'est pas encore terminé.

## Lot 1 — Première tranche verticale : atelier, clients, mensurations

- [ ] Authentification.
- [ ] Création et configuration d'un atelier.
- [ ] Isolation des données par atelier.
- [ ] CRUD client et recherche avec persistance serveur.
- [ ] Mensurations datées, types de vêtement et historique côté serveur.
- [ ] Tests d'accès et validation des données.

Le prototype actuel permet de tester l'interface clients/mesures localement, mais ne valide aucun de ces critères serveur.

**Critère de sortie :** un utilisateur autorisé peut créer un client et retrouver ses mensurations ; un autre atelier ne peut pas y accéder.

## Lot 2 — Commandes et production

- [ ] Créer une commande persistante liée à un client.
- [ ] Prix, quantité, date de commande et échéance.
- [ ] Étapes de production et historique.
- [ ] Vues des commandes en cours, urgentes et en retard.
- [ ] Acomptes, paiements partiels et solde dû enregistrés comme événements traçables.
- [ ] Tests de calculs et de transitions d'état.

**Critère de sortie :** une commande peut être suivie de sa création à sa livraison avec des montants cohérents.

## Lot 3 — Caisse, dépenses et stocks

- [ ] Journal des recettes et dépenses.
- [ ] Soldes clients, dettes et créances.
- [ ] Rapports par période avec calculs documentés.
- [ ] Articles, unités, quantités et seuils.
- [ ] Entrées/sorties et historique de stock.
- [ ] Association des achats aux fournisseurs et dépenses.

**Critère de sortie :** les opérations peuvent être rapprochées et les rapports sont vérifiés par des tests.

## Lot 4 — Pilote terrain et robustesse

- [ ] Préparer le guide de démonstration.
- [ ] Faire tester par un groupe initial d'ateliers.
- [ ] Recueillir retours et incidents sans stocker de données personnelles inutiles.
- [ ] Améliorer les parcours prioritaires.
- [ ] Vérifier sauvegarde, restauration, sécurité et performance mobile.
- [ ] Mesurer activation et usage à 7 et 30 jours.

**Critère de sortie :** aucun incident bloquant connu, parcours essentiels compris par les utilisateurs pilotes et procédure de support opérationnelle.

## Lot 5 — YÉRÉ Fournisseurs

- [ ] Profils professionnels.
- [ ] Catalogue et catégories de produits.
- [ ] Prix, disponibilité et zone desservie.
- [ ] Recherche et contact/demande de prix.
- [ ] Gestion commerciale fournisseur seulement si validée par les besoins.

## Lot 6 — YÉRÉ Market

- [ ] Vitrines publiques facultatives.
- [ ] Publication de créations et informations de contact.
- [ ] Recherche par ville et spécialité.
- [ ] Demandes de confection.
- [ ] Étude puis développement des paiements et livraisons, y compris diaspora.

## Règle de priorisation

Toute nouvelle demande est évaluée selon : fréquence du problème, impact sur le temps ou l'argent, nombre d'utilisateurs concernés, risque, coût de développement et dépendances. La sécurité, l'intégrité financière et la protection des données passent avant les fonctions de visibilité.
