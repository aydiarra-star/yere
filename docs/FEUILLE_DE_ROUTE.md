# Feuille de route initiale — YÉRÉ

Cette feuille de route est provisoire tant que l'audit technique et les premiers entretiens terrain ne sont pas terminés.

## Lot 0 — Établir les fondations
- [ ] Inspecter le dépôt, branches, fichiers et paramètres.
- [ ] Décider et documenter la stack après audit.
- [ ] Définir architecture, environnements et conventions de code.
- [ ] Ajouter configuration sûre, gestion des secrets et contrôles qualité.
- [ ] Définir les premiers modèles de données et la stratégie de migrations.
- [ ] Mettre en place tests et CI adaptés à la stack.

**Critère de sortie :** projet reproductible, testable, documenté, sans choix techniques inventés.

## Lot 1 — Première tranche verticale : atelier, clients, mensurations
- [ ] Authentification.
- [ ] Création et configuration d'un atelier.
- [ ] Isolation des données par atelier.
- [ ] CRUD client et recherche.
- [ ] Mensurations datées, types de vêtement et historique.
- [ ] Tests d'accès et validation des données.

**Critère de sortie :** un utilisateur autorisé peut créer un client et retrouver ses mensurations; un autre atelier ne peut pas y accéder.

## Lot 2 — Commandes et production
- [ ] Créer une commande liée à un client.
- [ ] Prix, quantité, date de commande et échéance.
- [ ] Étapes de production et historique.
- [ ] Vues des commandes en cours, urgentes et en retard.
- [ ] Acomptes, paiements partiels et solde dû.
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
