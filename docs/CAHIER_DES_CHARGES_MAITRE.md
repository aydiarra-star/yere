# Cahier des charges maître — YÉRÉ

**Statut :** référence produit initiale, à affiner après audit technique et entretiens terrain.  
**Marché de départ :** Sénégal.  
**Public prioritaire :** tailleurs indépendants et ateliers de couture.  
**Principe directeur :** aider chaque tailleur à mieux travailler, gagner du temps et comprendre ses finances avant d'ajouter une marketplace.

## 1. Vision
Construire un outil de gestion quotidien fiable, simple et abordable pour les ateliers de couture, puis un écosystème qui relie ateliers, fournisseurs et clients au Sénégal et, à terme, dans la diaspora.

## 2. Priorités produit
- **P0 — Fondations :** audit du dépôt, décisions techniques justifiées, sécurité, modèle de données, tests et sauvegardes.
- **P1 — Atelier essentiel :** comptes, clients, mensurations datées, commandes, étapes de confection, échéances, acomptes et soldes.
- **P2 — Gestion :** caisse, recettes, dépenses, dettes/créances, rapports, stocks et achats.
- **P3 — Pilote terrain :** onboarding accompagné, support, retours, stabilité et amélioration de l'expérience mobile.
- **P4 — Fournisseurs :** profils professionnels, catalogue, localisation/zone de livraison, demandes de prix et contacts.
- **P5 — Market :** vitrines facultatives, créations, commandes clients; ensuite seulement paiements et livraisons plus complexes.

## 3. Utilisateurs et accès
- **Atelier/propriétaire :** accès aux données de son entreprise, configuration et gestion des utilisateurs.
- **Employé d'atelier :** accès limité selon son rôle, si les comptes multi-utilisateurs sont retenus.
- **Fournisseur :** accès à ses produits, clients et commandes fournisseurs; aucun accès aux mensurations privées ou à la caisse des ateliers.
- **Client public :** consultation des vitrines et contact selon les fonctions publiées.
- **Administration technique :** accès strictement limité, contrôlé et auditable; pas de consultation ordinaire des données privées.

L'isolation des données entre ateliers est une exigence bloquante avant le pilote.

## 4. Fonctions du cœur atelier

### 4.1 Clients
- Fiche avec nom, contact et notes utiles.
- Recherche rapide.
- Historique des commandes, paiements et mensurations.
- Protection des coordonnées et collecte limitée aux données nécessaires.

### 4.2 Mensurations
- Enregistrement de mesures adaptées au vêtement.
- Unités explicites, date, type de vêtement et notes.
- Conservation des anciennes versions.
- Affichage rapide lors d'une nouvelle commande.
- Contrôle des accès et possibilité de corriger avec traçabilité.

### 4.3 Commandes et production
- Client, vêtement, quantité, prix convenu, date de commande, échéance, instructions.
- Statuts de production configurables.
- Acomptes, paiements complémentaires et solde.
- Alertes pour commandes proches de l'échéance et en retard.
- Historique des changements, annulations et livraisons.
- Reçu/récapitulatif partageable, sans exposer de données inutiles.

### 4.4 Caisse et finance
- Journal de recettes et dépenses.
- Suivi des créances, dettes et soldes clients.
- Gestion correcte des paiements partiels.
- Rapports par période.
- Résultat estimé à partir des coûts réellement renseignés, sans présenter une estimation comme une comptabilité certifiée.
- Historique des corrections et rapprochement de caisse à étudier pendant le pilote.

### 4.5 Stocks et achats
- Articles, catégories, unités et quantités.
- Entrées, sorties, pertes et seuils d'alerte.
- Coûts d'achat et historique.
- Lien entre fournisseur, achat, dépense et mouvement de stock.
- Unités adaptées aux tissus et fournitures (ex. pièce, bobine, mètre, lot), sans imposer une seule unité à tous les produits.

## 5. Expérience et accessibilité
- Mobile d'abord, interface également utilisable sur ordinateur.
- Français au lancement; architecture préparée à d'autres langues.
- Parcours simples, libellés clairs et démonstration possible en quelques minutes.
- Compatibilité avec appareils modestes et réseaux variables.
- États de chargement, messages d'erreur compréhensibles et confirmations pour actions importantes.
- Mode hors connexion limité uniquement si les règles de synchronisation et de conflits sont sûres.

## 6. Sécurité et confiance
- Authentification sécurisée et gestion des rôles.
- Contrôles d'accès côté serveur/base de données.
- Isolation des données par atelier.
- Protection des mensurations, coordonnées et données financières.
- Secrets exclusivement dans les gestionnaires prévus, jamais dans le dépôt.
- Sauvegardes automatisées et test de restauration.
- Migrations versionnées, journalisation sans secrets et gestion des erreurs.
- Export des données de l'atelier et procédure de fermeture de compte à définir.
- Politique de confidentialité, conditions d'utilisation et obligations légales à vérifier avant lancement.

## 7. Fournisseurs
Le compte fournisseur pourra évoluer vers :
- profil et coordonnées;
- catalogue de tissus, fils, aiguilles, boutons, fermetures, filets, machines et pièces;
- prix de détail et de gros facultatifs;
- disponibilité et date de mise à jour;
- demandes de prix et contact;
- gestion avancée de stock, caisse, ventes et dettes, si validée par les besoins.
La mise en relation peut commencer sans paiement intégré. Toute commission ne s'appliquera qu'à un service ou une transaction clairement défini.

## 8. Marketplace et diaspora
- Vitrine publique facultative pour chaque atelier.
- Créations, prix indicatifs, spécialités et zone.
- Recherche par ville/type de vêtement.
- Demande de confection et contact.
- Plus tard : paiements, livraison, suivi, litiges et conditions de vente adaptés au marché local et international.
La marketplace ne doit pas bloquer ou compliquer l'usage de YÉRÉ Atelier.

## 9. Acquisition terrain
1. Interroger un groupe pilote de tailleurs.
2. Choisir un quartier et un profil d'atelier de départ.
3. Faire une démonstration en boutique et configurer une première vraie fiche/commande avec consentement.
4. Former chaque utilisateur à une tâche utile.
5. Revenir sur les difficultés et les résoudre.
6. Développer le bouche-à-oreille avec des utilisateurs satisfaits.
7. Étendre la zone seulement après preuve d'utilisation et de fiabilité.

## 10. Modèle économique à tester
- Version gratuite utile pour favoriser l'adoption.
- Offre Pro pour fonctions avancées, à fixer après entretiens et validation de la valeur.
- Fournisseurs et visibilité payante facultatifs à un stade ultérieur.
- Commissions éventuelles uniquement si la plateforme facilite réellement une transaction.
Ne pas imposer des coûts qui empêchent les petits ateliers d'essayer le produit.

## 11. Indicateurs
- Comptes créés et ateliers activés.
- Pourcentage ayant créé client, mensurations et première commande.
- Utilisateurs actifs hebdomadaires.
- Rétention à 30 jours.
- Temps de création/recherche d'une commande.
- Erreurs de saisie et incidents de synchronisation.
- Nombre de recommandations et coût d'acquisition par atelier actif.
- Satisfaction et demandes de support.
- Conversion vers l'offre payante après démonstration de valeur.

## 12. Conditions minimales avant pilote
- Parcours client/mensurations/commande/paiement testé.
- Calculs des acomptes et soldes vérifiés.
- Séparation des données entre ateliers démontrée par des tests.
- Gestion des erreurs et des pertes de connexion testée.
- Sauvegarde et restauration testées.
- Pas de secrets ou de données réelles dans le dépôt.
- Guide d'installation, procédure de signalement des problèmes et support de base.
- Les limites connues sont documentées et les utilisateurs pilotes en sont informés.

## 13. Questions à trancher après audit
- Stack et hébergement définitifs.
- Application web responsive, PWA ou application native.
- Authentification et modèle multi-utilisateurs.
- Mode hors connexion et règles de synchronisation.
- Gestion des reçus et canaux de partage.
- Unités de mesure, devises et taxes applicables.
- Prix et limites de la version gratuite.
- Politique de conservation, export et suppression des données.

Ces décisions doivent être prises à partir du dépôt, des contraintes techniques et des retours terrain, pas par supposition.
