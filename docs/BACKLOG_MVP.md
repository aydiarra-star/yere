# Backlog MVP — YÉRÉ Atelier

Les tickets sont ordonnés par dépendance et valeur utilisateur. Les lots marketplace et fournisseurs ne sont pas dans le périmètre du premier MVP.

## EPIC 0 — Audit et préparation
- [ ] **YER-001 — Confirmer les contraintes produit et techniques**
  - Résultat : plateforme cible, budget, hébergement, disponibilité d'une base et besoin hors connexion documentés.
  - Acceptation : décisions explicites; inconnues listées sans hypothèses présentées comme des faits.
- [ ] **YER-002 — Choisir et documenter la stack**
  - Résultat : ADR validé et versions compatibles définies.
  - Acceptation : installation reproductible, commandes de développement et de test documentées.
- [ ] **YER-003 — Préparer le dépôt et les contrôles qualité**
  - Résultat : structure, formatage/lint, vérification de types, tests et CI adaptés à la stack.
  - Acceptation : pipeline exécutable et résultat visible; secrets absents du dépôt.

## EPIC 1 — Identité et atelier
- [ ] **YER-010 — Créer un compte et ouvrir une session**
  - Acceptation : erreurs compréhensibles, session persistante selon le modèle retenu, déconnexion fonctionnelle.
- [ ] **YER-011 — Créer un espace atelier**
  - Acceptation : chaque utilisateur autorisé est associé à un atelier; aucun accès implicite aux autres ateliers.
- [ ] **YER-012 — Tester l'isolation multi-atelier**
  - Acceptation : tests négatifs démontrent qu'un atelier ne peut ni lire ni modifier les données d'un autre.

## EPIC 2 — Clients et mensurations
- [ ] **YER-020 — Créer et modifier une fiche client**
  - Champs minimaux : nom, téléphone facultatif selon besoin, notes limitées au nécessaire.
  - Acceptation : validations, recherche et états vide/erreur.
- [ ] **YER-021 — Enregistrer des mensurations datées**
  - Acceptation : type de vêtement, unités explicites, date et notes; une nouvelle mesure n'efface pas l'historique.
- [ ] **YER-022 — Retrouver un client et ses anciennes mesures**
  - Acceptation : recherche utilisable sur petit écran et historique visible seulement aux membres autorisés de l'atelier.

## EPIC 3 — Commandes et production
- [ ] **YER-030 — Créer une commande client**
  - Champs : client, type de vêtement, quantité, prix convenu, date et échéance.
  - Acceptation : données validées et association au bon atelier.
- [ ] **YER-031 — Suivre les étapes de confection**
  - Acceptation : étapes historisées, progression compréhensible, commande livrée distinguée d'une commande en cours.
- [ ] **YER-032 — Afficher les commandes urgentes**
  - Acceptation : filtres pour échéances proches et retards, dates calculées sans ambiguïté de fuseau horaire.

## EPIC 4 — Paiements et caisse minimale
- [ ] **YER-040 — Enregistrer un acompte et des paiements partiels**
  - Acceptation : montant encaissé cumulé, solde dû et statut cohérents.
- [ ] **YER-041 — Protéger l'historique financier**
  - Acceptation : pas de suppression silencieuse d'une transaction; correction explicable et traçable.
- [ ] **YER-042 — Tester les règles de calcul**
  - Cas : zéro acompte, acompte partiel, paiement complet, paiement excédentaire, annulation et valeurs invalides.
  - Acceptation : tests automatisés couvrant les cas normaux et limites.

## EPIC 5 — Préparation du pilote
- [ ] **YER-050 — Préparer les données de démonstration fictives**
  - Acceptation : aucun client réel utilisé sans consentement; jeu de test réinitialisable.
- [ ] **YER-051 — Tester le parcours de bout en bout sur mobile**
  - Acceptation : créer atelier, client, mensuration, commande, acompte et livraison.
- [ ] **YER-052 — Documenter sauvegarde, export et restauration**
  - Acceptation : procédure testée en environnement non productif avant pilote.
- [ ] **YER-053 — Préparer un guide d'accompagnement terrain**
  - Acceptation : un accompagnateur peut montrer en quelques minutes la création d'un client et d'une commande.

## Hors périmètre du premier MVP
- Marketplace publique complète.
- Paiement intégré et commission de plateforme.
- Livraison internationale et suivi transporteur.
- Comptabilité certifiée, fiscalité avancée et paie.
- Mode hors connexion complet avant spécification des conflits et tests de synchronisation.
- Gestion avancée des stocks et comptes fournisseurs, sauf si les premiers entretiens démontrent que cela bloque l'adoption.

## Definition of Done

Une tâche n'est terminée que si son code est relu, les tests pertinents sont exécutés, les règles d'accès sont vérifiées, les erreurs sont traitées, la documentation est mise à jour et les limites restantes sont clairement annoncées.
