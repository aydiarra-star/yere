# Lancement commercial et abonnements — YÉRÉ Atelier

**Statut :** décision produit validée par le fondateur le 31 octobre 2026.  
**Périmètre :** YÉRÉ Atelier, application destinée exclusivement aux tailleurs et ateliers de couture au Sénégal.

## 1. Décision commerciale

- Chaque atelier bénéficie d'une période d'essai gratuite de **deux mois**.
- À partir du **troisième mois**, l'accès payant est proposé au tarif de **5 000 FCFA par atelier et par mois**.
- L'abonnement est attaché à l'atelier, et non à chaque employé ou compte utilisateur.
- Un atelier peut avoir plusieurs utilisateurs autorisés sans multiplier le prix de base de l'abonnement.
- Une formule de paiement annuel est prévue comme option. Son prix définitif et toute éventuelle remise annuelle restent à confirmer. À tarif mensuel constant, douze mois représentent 60 000 FCFA ; ce montant est une simple équivalence, pas encore une grille annuelle définitivement approuvée.

## 2. Règles de la période d'essai

1. L'essai commence à la date d'activation effective de l'atelier sur le service, pas à la date de création d'un simple compte non configuré.
2. La durée est de deux mois calendaires. Le calcul doit gérer correctement les fins de mois (par exemple, une activation le 31).
3. Une seule période d'essai est accordée par atelier. Une réinitialisation de mot de passe ou l'ajout/retrait d'un membre ne redémarre pas l'essai.
4. La date de début, la date de fin, le statut et l'identifiant de l'atelier sont conservés côté serveur.
5. Le passage au troisième mois ne doit pas déclencher un prélèvement automatique sans consentement explicite et sans prestataire de paiement configuré.
6. L'atelier doit être informé avant la fin de l'essai ; le délai et les canaux de notification sont à définir dans le parcours produit.

## 3. Abonnement payant

### Offre mensuelle

- Prix : **5 000 FCFA**.
- Unité de facturation : **un atelier par mois**.
- Le prix ne varie pas selon le nombre d'employés autorisés dans l'atelier, dans les limites des rôles et droits du produit.
- La période facturée, la date d'échéance, le montant, la devise, le statut et la référence du paiement doivent être historisés.

### Option annuelle

- Le paiement annuel doit être proposé comme une option, sans imposer une remise non validée.
- Base de calcul à tarif constant : **60 000 FCFA pour douze mois**.
- Toute réduction, promotion ou durée supplémentaire doit être approuvée avant d'être affichée ou facturée.

## 4. États d'abonnement à gérer

Les états fonctionnels minimaux à distinguer :

- `trialing` : période d'essai en cours ;
- `active` : abonnement payé et période courante valide ;
- `payment_pending` : paiement initié, mais pas encore confirmé ;
- `past_due` : échéance dépassée sans paiement confirmé ;
- `expired` : essai ou période payée terminé ;
- `cancelled` : renouvellement ou abonnement arrêté selon les conditions présentées au client.

Un retour du navigateur, une capture d'écran ou une déclaration du client ne vaut jamais confirmation de paiement. Seule une confirmation vérifiée côté serveur auprès du prestataire retenu peut activer ou renouveler un abonnement.

## 5. Données et protection de l'atelier

- L'abonnement appartient à un seul `atelier_id`.
- Les vérifications d'abonnement sont effectuées côté serveur ; masquer un bouton dans React n'est pas un contrôle d'accès.
- Les droits sont contrôlés par atelier et par rôle.
- Une expiration ou un impayé ne doit jamais supprimer les clients, mensurations, commandes ou historiques de paiement de l'atelier.
- En cas d'expiration, prévoir un état d'accès limité clairement expliqué, avec consultation/export des données selon la politique de conservation à définir. Ne jamais effacer les données pour forcer le paiement.
- Les événements de paiement et les changements de statut sont conservés dans un journal traçable et idempotent.
- Les clés secrètes et secrets du prestataire restent côté serveur ; aucune clé privée ou secrète n'est intégrée au frontend ni commitée dans Git.

## 6. Parcours utilisateur cible

1. Le propriétaire crée son compte et son atelier.
2. L'application explique clairement les deux mois gratuits et affiche les dates de début et de fin.
3. L'atelier utilise les fonctions disponibles pendant l'essai.
4. Avant la fin de l'essai, l'application affiche un rappel indiquant le tarif de 5 000 FCFA par mois et les modalités de souscription.
5. Le propriétaire choisit le paiement mensuel ou annuel.
6. Le paiement est initié auprès du prestataire retenu.
7. Le serveur vérifie la confirmation du prestataire, enregistre le paiement et active la période correspondante.
8. Le propriétaire peut consulter le statut, la prochaine échéance et l'historique des paiements.

## 7. Backlog technique — ordre et dépendances

### Avant toute facturation réelle

- [ ] Authentification réelle et récupération de compte.
- [ ] Base de données serveur dédiée à YÉRÉ.
- [ ] Isolation multi-ateliers vérifiée par tests avec au moins deux ateliers.
- [ ] Sauvegarde et restauration testées sur un environnement isolé.
- [ ] Source de temps serveur et calcul fiable des deux mois calendaires.
- [ ] Tables d'abonnement, périodes, événements de paiement et journal d'audit.
- [ ] Contrôle d'accès serveur lié à l'atelier et à l'état de l'abonnement.
- [ ] Choisir un prestataire de paiement adapté au Sénégal et vérifier ses capacités de confirmation serveur/webhook, remboursement et rapprochement.
- [ ] Définir les canaux de paiement réellement disponibles et les frais éventuels.
- [ ] Définir les conditions commerciales, la facturation/reçu, le support et la politique de données.
- [ ] Tests de bout en bout : essai, paiement réussi, paiement en attente, échec, webhook dupliqué, webhook invalide, renouvellement, expiration et accès limité.

### Critères de validation

- Un atelier ne peut consulter ni modifier l'abonnement d'un autre atelier.
- Un employé ne peut pas modifier le plan, le paiement ou le propriétaire de l'abonnement, sauf autorisation explicitement accordée.
- Un webhook répété ne crée pas deux paiements ni deux périodes.
- Un paiement en attente ne donne pas accès au statut payé.
- Une confirmation valide active exactement la période réglée.
- L'expiration ne supprime aucune donnée métier.
- Les tests et la restauration sont réussis avant l'utilisation de données réelles.

## 8. Indicateurs du pilote commercial

Pendant les deux mois d'essai, mesurer uniquement des indicateurs utiles à la décision :

- ateliers invités, inscrits et réellement activés ;
- ateliers ayant créé au moins un client et une commande ;
- utilisation hebdomadaire des fonctions principales ;
- problèmes bloquants et demandes récurrentes ;
- ateliers qui confirment leur intention de payer ;
- conversion en abonnement payant au début du troisième mois ;
- motifs de refus ou d'abandon.

Objectif de lancement proposé : recruter un premier groupe restreint d'ateliers pilotes, recueillir leurs retours en conditions réelles et améliorer le parcours avant d'élargir l'acquisition. Le nombre exact de pilotes et les objectifs de conversion restent à fixer.

## 9. Garde-fous de périmètre

- Cette décision commerciale ne signifie pas que le paiement en ligne est déjà intégré.
- Aucun prestataire, moyen de paiement, remise annuelle, période de grâce ou politique de prélèvement automatique n'est présumé choisi.
- Ne pas implémenter une facturation réelle tant que l'authentification, la base serveur, l'isolation des ateliers et la confirmation de paiement ne sont pas validées.
- Le prix de 5 000 FCFA est un prix par atelier et par mois, pas par utilisateur.
