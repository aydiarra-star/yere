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



## 5.1 Onboarding — démarrer avec la valeur, pas un module isolé

### Objectif et mesure
- À la première ouverture, faire comprendre la valeur principale de YÉRÉ en moins de 30 secondes.
- Guider un nouveau tailleur vers son premier client, puis ses mensurations et sa première commande.
- Objectif d'adoption : première fiche client créée dans les 3 minutes suivant le début de l'onboarding.
- Le délai est un indicateur d'amélioration produit, pas une faute de l'utilisateur. Mesurer aussi les abandons, les erreurs de formulaire et le taux de complétion, puis améliorer le parcours si la cible n'est pas atteinte.
- Ne pas transmettre d'événements d'usage ou de données personnelles sans information, base légale et paramétrage appropriés. Dans le prototype, la mesure est locale uniquement.

### Parcours de première ouverture
1. **Bienvenue — YÉRÉ Atelier.** Sous-titre « La couture, mieux organisée. » Message : « Retrouvez vos clients, leurs mensurations, vos commandes et vos paiements en un seul endroit. » Action principale : « Commencer ». Présenter une illustration originale d'un atelier réaliste, téléphone, fiches clients et vêtements en cours.
2. **Le problème résolu.** « Fini les cahiers perdus et les recherches interminables. » Mettre en avant mensurations, anciennes commandes, acomptes et dates de livraison ; bénéfice : gain de temps et réduction des erreurs.
3. **Suivi des commandes.** « Gardez chaque commande sous contrôle. » Présenter coupe, couture, essayage et livraison. Ne promettre des alertes automatiques de retard que lorsqu'elles sont effectivement implémentées.
4. **Gestion financière.** « Comprenez ce que votre atelier gagne réellement. » Présenter acomptes, paiements, dépenses et recettes. Distinguer les fonctions disponibles, simulées et à venir ; ne pas laisser croire qu'une comptabilité complète existe avant sa livraison.
5. **Inspirations couture.** « Conservez les modèles qui inspirent vos créations. » Photos envoyées par les clients, modèles enregistrés et créations réalisées. Positionner ceci comme un outil de travail, jamais comme un réseau social. Signaler explicitement que le catalogue est à venir tant qu'il n'est pas disponible.
6. **Créer l'atelier.** Champs : nom de l'atelier, téléphone et ville ; action « Commencer à utiliser YÉRÉ ». Ne pas présenter ce profil local comme un compte distant créé.
7. **Première action guidée.** Ouvrir directement la création d'un client, puis inviter à compléter les mensurations, puis à créer une commande. Afficher une progression simple et une option pour reprendre plus tard.

### États et exigences UX
- Aucun nouvel utilisateur ne doit atterrir directement dans « Relances clients » ni sur un tableau de bord vide sans explication.
- Pour un nouvel espace, ne pas injecter silencieusement de faux clients ou commandes. Les données d'exemple doivent être proposées dans un mode démonstration clairement identifié.
- Autoriser retour, reprise et sortie sans perdre silencieusement les champs ; expliquer les champs facultatifs et éviter de demander plus que nécessaire.
- Mobile d'abord, accessibilité clavier, libellés explicites, contraste et erreurs de validation lisibles.
- Montrer un chemin alternatif « Explorer la démonstration » avec des données fictives identifiables.

### Critères d'acceptation
- Un nouvel espace voit le parcours de bienvenue avant les modules.
- La valeur centrale est compréhensible en moins de 30 secondes lors des tests d'utilisabilité.
- Le profil d'atelier est validé et les limites de stockage local sont affichées.
- Après configuration, l'écran de création du premier client est ouvert automatiquement.
- Après création du client, l'interface propose la saisie de ses mensurations puis la création d'une commande.
- Le délai jusqu'au premier client est mesuré sans envoyer de données personnelles depuis le prototype ; le taux de première fiche en moins de 3 minutes est suivi lors des tests terrain.
- Les données de démonstration sont distinctes des données créées par l'utilisateur et ne sont pas chargées silencieusement.
- Les fonctionnalités non livrées (alertes, comptabilité complète, inspirations, serveur) sont annoncées comme prévues, jamais comme actives.


## 5.2 Charte visuelle officielle YÉRÉ Atelier

### Positionnement
YÉRÉ est un outil professionnel de gestion d'atelier, pas un réseau social ni une application de divertissement. L'interface doit inspirer confiance, organisation, fiabilité, simplicité et professionnalisme ; elle doit rassurer sur le traitement des clients, mensurations, paiements et informations commerciales. La clarté et l'usage quotidien priment sur l'effet spectaculaire.

### Palette de marque
- **Bleu YÉRÉ — #3B5BDB :** couleur de marque et d'action. Logo, navigation, boutons principaux, éléments interactifs, états actifs et actions importantes. Le bleu existant est conservé comme signature de confiance, stabilité, sérieux et crédibilité.
- **Or textile — #D4A017 :** accent parcimonieux inspiré des broderies et finitions. Badges valorisants, statistiques positives, offres premium, marketplace et détails de réussite. Il ne doit jamais remplacer les couleurs de statut fonctionnelles.
- **Vert — succès uniquement :** paiement reçu, solde réglé, opération validée et bénéfice explicitement identifié comme estimé.
- **Orange — attention :** retard de livraison, paiement partiel, action requise ou stock bas.
- **Rouge — critique :** erreurs, suppression, opération échouée et dette nécessitant une alerte explicite.
- Les états ne reposent jamais uniquement sur la couleur : ajouter un libellé, une icône ou une explication accessible.

### Règles d'interface
- Écrans épurés, grandes zones tactiles, typographie lisible, contraste suffisant, peu de texte non essentiel et actions primaires clairement identifiées.
- Priorité à une utilisation d'une seule main, au téléphone et dans un atelier bruyant ; ne pas dépendre uniquement de sons, animations ou gestes complexes.
- Libellés directs en français, erreurs formulées de manière compréhensible et confirmation explicite pour les actions destructrices.
- Les éléments or sont des accents, jamais une décoration omniprésente. Pas de gradients ou d'animations qui nuisent à la lecture ou à la rapidité.
- Accessibilité clavier et focus visible, respect de la préférence de réduction des animations et validation du contraste avant le pilote.

### Navigation mobile
Sur petit écran, utiliser une barre inférieure fixe à cinq entrées principales :
1. Accueil
2. Clients
3. Commandes
4. Caisse
5. Compte

Chaque entrée doit disposer d'une icône et d'un libellé visible. Prévoir les zones de sécurité iOS, éviter le chevauchement avec les formulaires et permettre l'accès aux fonctions secondaires (dont les relances) depuis un endroit explicite. Sur grand écran, conserver une navigation latérale claire.

### Principes fonctionnels associés
- La caisse ne doit pas être présentée comme une comptabilité complète tant que les encaissements multiples, dépenses, mouvements et rapports ne sont pas implémentés et testés.
- La navigation, les boutons et les couleurs de statut doivent rester cohérents entre l'onboarding et les modules.
- Toute information financière doit être exacte, explicable et distinguée des valeurs estimées ou des données de démonstration.

### Critères d'acceptation
- Bleu de marque #3B5BDB utilisé de manière cohérente pour les actions primaires et les états actifs.
- Or textile #D4A017 limité aux accents valorisants.
- Vert, orange et rouge employés selon les rôles fonctionnels ci-dessus et accompagnés d'un libellé.
- Sur mobile, cinq destinations principales visibles en permanence sans masquer le contenu ni les boutons d'action.
- Les tests terrain confirment que des tailleurs peuvent identifier les actions principales sans formation.

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


## 4.6 Fidélisation et relances clients — YÉRÉ Relances

**Objectif métier :** aider l'atelier à retrouver ses anciens clients et à anticiper les commandes saisonnières, sans transformer YÉRÉ en outil de démarchage intrusif.

### Parcours et fonctions attendus
- Afficher un carnet de relance à partir de l'historique fiable des commandes datées.
- Proposer une réactivation après un seuil initial de 180 jours sans commande ; rendre le seuil configurable ultérieurement.
- Repérer les anciennes commandes de cérémonie (mariage, baptême, Tabaski, Korité, rentrée scolaire) et suggérer une prise de contact assez tôt pour le délai de confection.
- Permettre à l'atelier de définir ses propres événements, dates, période de préparation et délai de confection.
- Pour les fêtes à date variable, utiliser une date vérifiée et modifiable ; ne jamais figer une date annuelle supposée.
- Générer un message court, poli et personnalisable, avec aperçu et copie manuelle dans le premier lot.
- Distinguer les rappels commerciaux des alertes opérationnelles (essayage, commande prête, échéance ou solde).
- Permettre d'ignorer, de reporter ou de marquer une suggestion comme traitée ; conserver l'historique nécessaire pour éviter les doublons.
- Enregistrer les tentatives de contact, le canal, la date et le résultat lorsqu'un contact a réellement eu lieu.
- Relier facultativement une campagne à une demande de devis ou à une commande ultérieure pour mesurer les résultats sans attribuer automatiquement tout revenu à une suggestion.

### Protection des clients et limites d'envoi
- Prévoir une préférence de contact, un indicateur « ne pas contacter » et la traçabilité de leur mise à jour avant toute fonction d'envoi.
- Respecter les coordonnées manquantes ou invalides, les refus de contact et une période de calme configurable.
- Dédupliquer les suggestions par client, règle et campagne.
- Le MVP ne doit envoyer aucun SMS, message WhatsApp ou campagne automatiquement. Copier un texte ne signifie pas qu'il a été envoyé.
- Toute intégration de messagerie ultérieure nécessite une validation explicite du canal, des coûts, du consentement, des obligations légales et du mécanisme d'arrêt.
- Les données et campagnes sont strictement isolées par atelier ; les mensurations ne sont jamais incluses dans les messages marketing.

### Indicateurs
- Suggestions affichées, ignorées, reportées et traitées.
- Tentatives de contact effectivement consignées, réponses, demandes de devis et commandes liées.
- Chiffre d'affaires associé uniquement selon une règle d'attribution documentée ; ne pas présenter une suggestion comme une vente générée.

### Livraison par étapes
1. Prototype local : suggestions explicables et copie manuelle, avec données fictives.
2. Backend sécurisé : préférences de contact, refus, statut des suggestions et historique de contact isolés par atelier.
3. Calendrier configurable : événements, périodes de préparation, ciblage et déduplication.
4. Mesure commerciale puis, éventuellement, intégrations de messagerie après validation dédiée.

**Critère bloquant avant usage réel :** authentification, isolation serveur par atelier, préférences de contact, journal de contact, sauvegarde et tests d'accès croisé validés.
