# Plan pilote et préparation du lancement commercial — YÉRÉ

**Version de travail :** 2 novembre 2026  
**Public cible :** tailleurs indépendants et ateliers de couture au Sénégal.  
**Décision tarifaire validée :** deux mois d'essai gratuits, puis 5 000 FCFA par atelier et par mois, équipe incluse.

## 1. Positionnement

YÉRÉ aide un atelier à organiser son travail au même endroit :

- fiches clients et mensurations ;
- commandes, délais et suivi de production ;
- tâches attribuées aux membres de l'équipe ;
- stock, fournisseurs et achats ;
- caisse et informations financières réservées au propriétaire ;
- vitrine publique et échanges dans YÉRÉ Market.

**Promesse à tenir :** mieux organiser les clients, les mesures, les commandes et le travail de l'équipe. Ne pas promettre une hausse de chiffre d'affaires, une rentabilité garantie ou une comptabilité certifiée.

## 2. Offre commerciale

- Essai gratuit : deux mois par atelier.
- À partir du troisième mois : 5 000 FCFA par atelier et par mois.
- Tous les membres autorisés de l'équipe sont inclus dans le prix de l'atelier.
- Le prix n'est pas facturé par employé.
- Aucun prélèvement automatique n'est activé.
- Aucun prestataire de paiement en ligne n'est encore choisi ou intégré.
- Le propriétaire doit voir la date de fin de son essai et les conditions avant toute facturation.

Aucune remise annuelle, promotion ou frais supplémentaire ne doit être annoncé sans validation explicite.

## 3. Groupe pilote recommandé

Commencer avec un groupe restreint plutôt qu'une campagne publique :

- **5 ateliers pilotes** comme première cible de recrutement ;
- au moins un propriétaire et, si possible, un collaborateur par atelier ;
- **2 fournisseurs pilotes** pour tester l'offre de tissus et de mercerie dans YÉRÉ Market.

Ces nombres sont des objectifs proposés, pas des inscriptions déjà obtenues. Recruter d'abord par démonstration directe, recommandations et contacts professionnels. Éviter les dépenses publicitaires tant que le parcours n'est pas validé.

## 4. Démonstration de cinq minutes

1. Ouvrir l'espace atelier et présenter le rôle du propriétaire.
2. Créer une fiche client de démonstration et saisir quelques mensurations fictives.
3. Créer une commande, indiquer le délai et montrer son suivi.
4. Attribuer une tâche à un tailleur et montrer la mise à jour de son avancement.
5. Montrer le stock et le répertoire fournisseurs.
6. Montrer que la caisse et les montants restent réservés au propriétaire.
7. Ouvrir YÉRÉ Market et montrer comment un tailleur ou un fournisseur crée sa boutique et publie une offre.

Utiliser uniquement des données fictives pendant la démonstration. Ne pas présenter les anciennes fiches locales comme des annonces publiques : seules les annonces créées dans YÉRÉ Market sont publiées sur le catalogue commun.

## 5. Parcours d'intégration d'un atelier pilote

### Avant l'activation

- Expliquer ce que YÉRÉ stocke et qui peut voir les informations.
- Créer le compte du propriétaire et son atelier.
- Vérifier que le propriétaire peut retrouver son atelier après déconnexion et reconnexion.
- Présenter les rôles : Propriétaire, Gestionnaire et Employé.
- Expliquer que les invitations sont consultables dans la boîte de réception intégrée après connexion avec la même adresse e-mail ; l'invitation n'envoie pas encore automatiquement un e-mail.

### Première séance

- Ajouter un client fictif, ses mensurations et une commande fictive.
- Vérifier l'affichage après actualisation de la page.
- Inviter un collaborateur de test et vérifier son rôle.
- Confirmer que le collaborateur ne voit pas la caisse ni les montants réservés au propriétaire.
- Montrer comment désactiver l'accès d'un membre qui quitte l'atelier.

### Suivi pendant les deux mois

- Faire un point court chaque semaine avec le propriétaire.
- Relever les blocages, les erreurs de synchronisation et les fonctions réellement utilisées.
- Mesurer si les clients, mensurations et commandes sont retrouvés sur un autre appareil après reconnexion.
- Recueillir les demandes sans promettre immédiatement une nouvelle fonctionnalité.
- Prévenir le propriétaire avant la fin de son essai ; ne déclencher aucun paiement sans accord explicite.

## 6. Contrôles obligatoires avant d'utiliser des données clients réelles

- [ ] Les tests GitHub unitaires et le build passent.
- [ ] Toutes les migrations sont rejouées avec succès sur une base isolée.
- [ ] Les rôles Propriétaire, Gestionnaire et Employé sont testés avec des comptes distincts.
- [ ] Deux ateliers distincts ne peuvent pas lire ou modifier les données l'un de l'autre.
- [ ] La caisse, les versements et les dépenses restent invisibles aux Gestionnaires et Employés.
- [ ] Les fiches clients, mensurations, commandes, stocks et achats sont retrouvés après actualisation et reconnexion.
- [ ] Le profil de l'atelier est bien synchronisé côté serveur.
- [ ] Une restauration complète d'une sauvegarde chiffrée a été testée sur un environnement isolé.
- [ ] Le parcours d'inscription, confirmation d'e-mail, récupération du mot de passe et invitation est testé dans un navigateur avec de vrais comptes de test.
- [ ] YÉRÉ Market est testé avec un compte vendeur fournisseur, un compte vendeur atelier et un compte acheteur distincts.
- [ ] Une annonce publiée est visible publiquement ; une commande et une conversation sont visibles uniquement par leurs participants.
- [ ] Les conditions d'utilisation, la politique de confidentialité et un canal de support sont prêts.

**Règle de lancement :** tant que la restauration complète et les tests réels des rôles ne sont pas validés, ne pas annoncer YÉRÉ comme prêt à recevoir toutes les données réelles d'un atelier.

## 7. État technique observé le 2 novembre 2026

- Projet Supabase YÉRÉ actif ; 46 migrations enregistrées.
- 24 tables publiques sur 24 ont RLS activé ; 59 politiques RLS.
- 3 comptes Auth, 3 ateliers et 5 appartenances présentes.
- 3 abonnements d'atelier sont en état d'essai au tarif enregistré de 5 000 FCFA par mois.
- Le catalogue Market ne contient encore aucun vendeur, aucune annonce et aucune commande : il faut recruter les premiers vendeurs avant de le présenter comme un marché actif.
- Les sauvegardes chiffrées sont configurées, mais le dépôt ne contient pas encore de procédure automatisée de restauration complète ; le test de restauration reste obligatoire.
- Le service Render identifié est `yere-main-preview`, relié au dépôt `aydiarra-star/yere` et à la branche `main`. Il s'agit d'un service de prévisualisation ; aucun service de production distinct n'a été identifié dans l'espace Render vérifié.

## 8. Indicateurs du pilote

Suivre chaque semaine :

- ateliers contactés, inscrits et réellement activés ;
- ateliers ayant créé au moins une fiche client et une commande ;
- ateliers actifs chaque semaine ;
- commandes suivies jusqu'à la livraison ;
- membres invités et taux d'utilisation de l'équipe ;
- incidents de synchronisation ou de permissions ;
- vendeurs et annonces réellement publiés dans le Market ;
- propriétaires qui confirment leur intention de poursuivre à 5 000 FCFA par mois.

À la fin du deuxième mois, décider avec chaque propriétaire de la suite. Ne pas confondre un compte créé avec un atelier qui utilise réellement YÉRÉ.

## 9. Message commercial de base

> YÉRÉ aide les tailleurs à mieux organiser leurs clients, leurs mensurations, leurs commandes et le travail de leur équipe. Le propriétaire garde le contrôle de la caisse, tandis que chacun travaille avec les accès qui correspondent à son rôle. Vous pouvez essayer YÉRÉ gratuitement pendant deux mois. Ensuite, l'abonnement est de 5 000 FCFA par mois pour tout l'atelier, toute l'équipe incluse.

Ce message ne doit être diffusé à grande échelle qu'après validation des contrôles de la section 6.
