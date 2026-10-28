# Feuille de route initiale — YÉRÉ

Cette feuille de route suit le prompt maître. Les coches indiquent uniquement un travail effectivement réalisé et vérifié ; le prototype local ne compte pas comme une fonctionnalité serveur sécurisée.

## État du chantier au 27 octobre 2026

- Dépôt audité : frontend React + TypeScript + Vite présent ; site statique Render configuré sur `feat/atelier-first-slice`.
- Prototype : clients, mensurations historisées, commandes, solde de démonstration et centre « Relances clients » dans le navigateur ; aucune donnée réelle ne doit être saisie.
- CI : GitHub Actions #71 réussie sur le commit `bd3165af85a6b9594c0560b075d9056292a89035` (tests unitaires et compilation).
- Mode hors ligne : code ajouté et déploiement du prototype confirmé ; test réel en mode avion toujours à effectuer.
- Backend : aucun backend, compte atelier, base YÉRÉ ou isolation multi-atelier intégrés.
- Environnement : le projet Supabase connecté est « Dekk Food » (inactif), pas un projet YÉRÉ ; ne pas le réutiliser.
- PR #2, #4, #5 et #6 : fusionnées ; le prototype et ses fondations sont maintenant intégrés à `main`.
- Prochaine dépendance : choisir/provisionner un environnement de développement dédié à YÉRÉ avant d'intégrer l'authentification et la persistance distante.

## Lot transverse — Un socle commun pour les cinq métiers

- [x] Formaliser les cinq catégories cibles et le principe « une seule plateforme, plusieurs métiers » dans le cahier des charges et le prompt maître.
- [x] Distinguer l'activité principale du mode de travail (indépendant, collaborateurs, atelier en équipe).
- [x] Auditer l'onboarding actuel et proposer les cinq métiers sans dupliquer les parcours.
- [x] Définir les valeurs contrôlées du profil métier et préserver la compatibilité avec les profils locaux existants.
- [x] Adapter l'accueil et les raccourcis selon le profil, tout en gardant le socle commun accessible.
- [ ] Vérifier que les fonctions d'équipe peuvent servir toute activité qui travaille avec des collaborateurs.
- [x] Ajouter des tests pour le changement de profil, les activités secondaires et la compatibilité des données.
- [ ] Ajouter des tests d'intégration confirmant l'absence de duplication des entités communes.
- [x] Corriger la restauration des sauvegardes historiques : les versions 1 à 3 sans champs d’onboarding reprennent avec un profil déjà configuré ; les champs invalides restent refusés.

**Critère de sortie :** les cinq métiers peuvent utiliser le même produit ; le profil personnalise l'expérience sans limiter les fonctions utiles ni compromettre les données. La documentation ne vaut pas implémentation applicative.

## Lot 0 — Établir les fondations

- [x] Inspecter le dépôt, branches, fichiers et paramètres accessibles.
- [ ] Décider et documenter la stack finale après audit (proposition documentée, décision finale encore ouverte).
- [ ] Définir l'architecture cible et les environnements ; les garde-fous et l'ordre sont documentés, mais le backend n'est pas choisi.
- [ ] Ajouter la configuration sûre et la gestion des secrets côté backend.
- [x] Définir les premiers modèles de données et la stratégie de migrations dans la documentation.
- [x] Mettre en place les tests unitaires et la CI ; dernier run consulté réussi.
- [x] Déployer le commit `bd3165af85a6b9594c0560b075d9056292a89035` avec l'historique des mensurations et le centre de relance (déploiement Render réussi).
- [ ] Tester la PWA en mode avion sur mobile et ordinateur.
- [x] Définir les règles MVP du module Relances clients, ses limites anti-spam et ses critères d'acceptation dans `docs/RELANCES_CLIENTS.md`.
- [ ] Tester les parcours du centre de relance sur la prévisualisation et corriger les anomalies éventuelles.

**Critère de sortie :** projet reproductible, testable, documenté, sans choix techniques inventés. Le lot 0 n'est pas encore terminé.


## Lot 0 bis — Onboarding et activation initiale

- [x] Ajouter un parcours de première ouverture en six écrans avec valeur produit, suivi des commandes, aperçu financier et inspirations clairement annoncées comme à venir.
- [x] Ajouter la création locale du profil atelier et l'accès direct au formulaire du premier client.
- [x] Distinguer l'entrée vierge de l'exploration de la démonstration avec données fictives.
- [x] Ajouter une mesure locale du délai jusqu'à la première fiche client, avec le seuil d'analyse de trois minutes.
- [x] Inscrire le parcours, les critères d'acceptation et la règle de mesure au cahier des charges maître.
- [x] Vérifier par CI les tests et la compilation du parcours (voir l'exécution liée au commit applicatif ci-dessous).
- [ ] Tester l'onboarding sur téléphone réel, clavier, reprise et rafraîchissement.
- [ ] Remplacer/compléter l'illustration CSS conceptuelle par une illustration originale plus réaliste d'un atelier de couture, après validation visuelle.
- [x] Relier le parcours client → formulaire de mensurations → formulaire de première commande dans le prototype.
- [ ] Faire des tests d'utilisabilité et suivre le taux de première fiche créée en moins de trois minutes.

**Limite actuelle :** le profil d'atelier, l'état de l'onboarding, les clients et les commandes restent dans le stockage local du navigateur. Ce n'est pas une inscription serveur.


## Lot UI — Charte visuelle et navigation mobile

- [x] Formaliser le bleu YÉRÉ #3B5BDB et l'or textile #D4A017 dans le cahier des charges maître.
- [x] Définir les couleurs fonctionnelles succès/attention/critique et les règles de contraste et de lisibilité.
- [x] Ajouter une navigation mobile inférieure avec Accueil, Clients, Commandes, Caisse et Compte.
- [x] Ajouter les vues Caisse et Compte dans le prototype, avec avertissement explicite sur les limites du suivi financier et du stockage local.
- [ ] Vérifier la navigation sur appareils iOS/Android, le safe area, le clavier et les petits écrans.
- [ ] Auditer le contraste, les états fonctionnels et la cohérence visuelle de tous les modules.
- [ ] Ajouter et tester les fonctions financières complètes après la mise en place du backend sécurisé.

## Lot 1 — Première tranche verticale : atelier, clients, mensurations

- [ ] Authentification.
- [ ] Création et configuration d'un atelier.
- [ ] Isolation des données par atelier.
- [ ] CRUD client et recherche avec persistance serveur.
- [ ] Mensurations datées, types de vêtement et historique côté serveur.
- [ ] Ajouter les dates de commande fiables et l'historique serveur nécessaires aux suggestions de relance.
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

## Lot 4 bis — Relances clients et campagnes saisonnières

- [x] Ajouter les exigences YÉRÉ Relances au cahier des charges maître et les entités candidates au modèle de données.
- [x] Documenter le concept, les règles MVP, les garde-fous et les critères d'acceptation.
- [x] Ajouter au prototype des suggestions d'inactivité (seuil initial de 180 jours) et de souvenir d'occasion à partir des commandes datées.
- [x] Prévisualiser un message et permettre sa copie manuelle ; aucun envoi automatique.
- [ ] Ajouter préférences de contact, refus (« ne pas contacter »), suggestions reportées/ignorées/traitées et historique de contact côté serveur.
- [ ] Ajouter un calendrier d'événements configurable par atelier ; confirmer les dates des fêtes à calendrier variable.
- [ ] Mesurer les contacts réellement effectués, réponses, devis et commandes attribuées, sans assimiler une suggestion à un revenu.

**Critère de sortie :** les relances sont explicables, non intrusives, isolées par atelier et mesurables sur des résultats réels.

## Règle de priorisation

Toute nouvelle demande est évaluée selon : fréquence du problème, impact sur le temps ou l'argent, nombre d'utilisateurs concernés, risque, coût de développement et dépendances. La sécurité, l'intégrité financière et la protection des données passent avant les fonctions de visibilité.


## Banque d'idées stratégiques — intégration à la feuille de route

- [x] Enregistrer la vision « YÉRÉ, système d'exploitation de l'atelier » dans un document séparé, sans élargir automatiquement le MVP.
- [x] Formaliser le filtre anti-gadget : plus simple, plus rapide et plus utile que le cahier.
- [x] Classer les idées : assistant quotidien, mémoire client, mensurations, rentabilité, calendrier local, portfolio, santé de l'atelier, tendances anonymisées et diaspora long terme.
- [x] Ajouter des garde-fous sur les données financières, les anciennes mensurations, les photos/consentements et l'anonymisation.
- [x] Première version prototype de « Que dois-je faire aujourd'hui ? » : affiche les commandes en retard, les livraisons du jour et les soldes des commandes prêtes à livrer, avec explication des données utilisées.
- [ ] Valider les règles de priorité avec des ateliers pilotes et ajouter des sources fiables pour les paiements, stocks et contacts avant d'élargir l'assistant.
- [ ] Ne pas présenter cette version locale comme une alerte complète : les données peuvent être incomplètes et ne sont ni synchronisées ni sauvegardées sur serveur.
- [ ] Avant d'utiliser des données réelles : comptes, isolation des ateliers, sauvegarde/restauration testée, autorisations et protection des données.
- [ ] Ne pas lancer les tendances agrégées, marketplace étendue ou commande diaspora avant d'avoir validé l'usage du MVP.

Référence : [Banque d'idées stratégiques](./BANQUE_IDEES_STRATEGIQUES.md).



## Assistant quotidien — durcissement de la logique métier

- [x] Extraire les règles de l'assistant quotidien dans une fonction métier testable : retards, échéances du jour, soldes des commandes prêtes et dates invalides.
- [x] Ajouter des tests unitaires ciblés sur les priorités et les dates incohérentes ; étapes « Run unit tests » et « Build application » réussies dans GitHub Actions #40532188592 (nettoyage du job encore en cours lors du contrôle).
- [ ] Valider les règles de priorité avec des ateliers pilotes et relier l'assistant à des paiements/stocks fiables après le backend.


## Backend — contrat de sécurité et critères bloquants

- [x] Ajouter `docs/CONTRAT_SECURITE_BACKEND.md` : modèle d'autorisation par atelier, tests d'isolation, validation serveur, secrets, paiements idempotents, sauvegarde/restauration et critères de pilote.
- [x] Ajouter `docs/CHOIX_FOURNISSEUR_BACKEND.md` : comparer les voies techniques sans créer de service ni réutiliser un projet existant.
- [x] Préparer un brouillon de schéma PostgreSQL avec appartenance atelier, mensurations historisées, contraintes de cohérence et journal de paiements idempotent : `docs/sql/0001_initial_schema.sql` (non appliqué, non sécurisé à lui seul).
- [ ] Après décision du fournisseur, convertir ce brouillon en migration versionnée, ajouter les politiques d'accès et exécuter les tests d'isolation inter-ateliers.
- [ ] Confirmer le fournisseur et créer un environnement dédié à YÉRÉ ; ne pas réutiliser Dekk Food.
- [ ] Implémenter authentification et isolation multi-atelier, puis faire réussir les tests d'accès inter-ateliers.
- [ ] Exécuter et documenter un exercice réel de restauration avant toute donnée client réelle.

## Stockage local — validation de forme au chargement

- [x] Ajouter des gardes d'exécution pour la structure des listes de clients et de commandes récupérées depuis le stockage navigateur.
- [x] Contrôler la forme des mensurations et de leur historique, les dates calendaires, les statuts de commande et la cohérence des montants avant de réutiliser les données JSON.
- [x] Appliquer une validation aux états locaux du profil d'atelier et de l'onboarding.
- [x] Ajouter des tests unitaires sur les données persistées mal formées et les montants incohérents.
- [ ] Confirmer la CI complète sur le dernier commit ; l'absence de résultat retourné par la vérification actuelle ne vaut pas succès.
- [x] Préserver une copie brute des données rejetées sous une clé locale `.recovery` (puis `.recovery-2`, etc.) avant le remplacement ; si la copie échoue, ne pas écraser la valeur lors du premier rendu.
- [x] Ajouter des tests unitaires pour la copie de récupération, l'absence d'écrasement d'une copie existante et l'échec d'écriture.
- [ ] Ajouter une interface d'export/restauration vérifiable : la copie cachée de récupération n'est pas une sauvegarde distante et n'est pas encore accessible depuis l'interface.
- [ ] Ajouter les validations côté serveur lors de l'intégration du backend.

## Commandes — validation métier avant persistance locale

- [x] Centraliser la validation de création de commande dans `src/domain.ts`.
- [x] Refuser un client inconnu, un vêtement vide, une date calendaire invalide, un prix non entier/non sûr/non positif et un acompte supérieur au prix.
- [x] Ajouter des tests unitaires pour les montants et dates incohérents dans `src/domain.test.ts`.
- [x] Corriger le motif de date après l'échec du test CI initial.
- [ ] Confirmer un passage complet de la CI sur la dernière révision de la PR avant de considérer ce changement vérifié.
- [ ] Ajouter ultérieurement une validation équivalente côté serveur : la validation du navigateur n'est pas une frontière de sécurité.
