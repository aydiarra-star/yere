# Centre des paramètres DTech et mode hors ligne — contrat de réalisation

## Décisions produit validées

- Le nom de l'éditeur affiché dans YÉRÉ est **DTech**. Ne pas afficher « GROUPE DIARRA TECHNOLOGIES » dans les nouveaux écrans de présentation ou d'éditeur.
- Le centre des paramètres est accessible depuis le profil de l'utilisateur, sans ajouter d'icône supplémentaire à la navigation principale.
- Le centre regroupe : compte et sécurité ; atelier et équipe ; abonnement ; guide d'utilisation ; services et assistance ; présentation de YÉRÉ ; conditions générales ; confidentialité ; informations de version et mises à jour.
- Les contenus et actions proposés dépendent du rôle effectif de l'utilisateur dans l'atelier.

## Règles d'accès

- Propriétaire : gestion du profil de l'atelier, des membres et invitations, de l'abonnement et des informations financières déjà autorisées par les règles serveur.
- Gestionnaire et employé : accès aux réglages de compte et aux guides utiles à leur rôle ; aucune exposition de la caisse, des dépenses, des paiements ou des montants financiers.
- Les règles d'accès doivent être imposées par Supabase/RLS et les fonctions serveur. Masquer un bouton dans React ne constitue pas une protection.
- Les CGU et la politique de confidentialité doivent être consultables avant l'inscription et depuis les paramètres après connexion. Enregistrer côté serveur la version acceptée et sa date ; redemander l'acceptation lors d'une évolution substantielle.

## Mode hors ligne : périmètre sûr

### Ce qui existe déjà dans `main`

- `public/sw.js` met en cache la coque de l'application et certaines ressources statiques.
- `src/main.tsx` enregistre le service worker uniquement pour l'entrée professionnelle.
- Le cache permet au mieux de rouvrir l'interface déjà visitée. Il ne constitue ni une base de données métier, ni une sauvegarde, ni une synchronisation.

### Ce qui n'est pas encore démontré

- La consultation hors ligne des dossiers métier avec contrôle d'accès et données réellement synchronisées.
- Une file d'attente durable et sûre des opérations créées hors connexion.
- La résolution des conflits lorsque plusieurs appareils modifient le même dossier.
- La synchronisation idempotente vers Supabase après reconnexion.
- Le chiffrement local, l'expiration/effacement des données locales et les tests de fuite entre deux comptes ou deux ateliers.
- La validation sur iPhone et ordinateur en mode avion.

### Démarrage et vérification de session — correctif appliqué

- Au démarrage, une session déjà enregistrée n'est plus effacée simplement parce que la vérification du compte ou de l'atelier échoue temporairement (par exemple en cas de coupure réseau).
- Dans ce cas, l'application conserve la session et affiche un écran de vérification avec une action « Réessayer » et une possibilité de déconnexion.
- Aucun atelier ni aucune donnée métier ne sont affichés tant que le serveur n'a pas confirmé l'accès à l'atelier.
- Une session absente ou un retour d'authentification invalide ne donne pas accès à l'espace professionnel.
- Ce correctif évite une déconnexion locale intempestive ; il ne fournit pas encore un accès métier hors ligne et ne remplace pas la validation des droits par Supabase.

### Architecture obligatoire avant d'activer l'écriture hors ligne

1. Supabase reste l'unique source de vérité. Le navigateur conserve seulement une copie locale bornée, explicitement marquée comme synchronisée ou en attente.
2. Ne jamais réimporter automatiquement les anciennes clés ou archives localStorage dans les dossiers actifs. Ne jamais supprimer ni écraser ces archives dans le cadre de ce chantier.
3. Chaque opération en attente porte un identifiant unique, l'identité du compte, l'identifiant de l'atelier, le type d'opération, l'horodatage, la version de l'enregistrement de base et un état de synchronisation.
4. À la reconnexion, revalider la session, l'appartenance active à l'atelier et les droits du rôle avant chaque envoi. Refuser toute opération si le compte, l'atelier ou les droits ont changé.
5. Les envois doivent être idempotents : une même opération rejouée ne doit jamais créer deux clients, deux commandes ou deux paiements.
6. Les conflits ne doivent jamais être résolus par écrasement silencieux. Afficher les deux versions et demander une décision explicite lorsque la fusion automatique n'est pas sûre.
7. Ne jamais mettre en cache la caisse, les dépenses, les paiements, les soldes ou autres données financières pour les gestionnaires et employés. Les fonctions financières restent réservées au propriétaire et protégées côté serveur.
8. Marketplace, paiements en ligne, invitations et acceptation des CGU nécessitent une connexion. Ne pas simuler leur réussite hors ligne.
9. Prévoir une action de déconnexion qui purge uniquement le cache métier chiffré du compte courant et sa file d'attente, sans toucher aux archives historiques explicitement conservées.

## État de synchronisation à afficher

- « En ligne » : connexion réseau détectée ; cela ne signifie pas à lui seul que les données sont synchronisées.
- « Hors ligne » : réseau indisponible ; afficher la date de dernière synchronisation réussie.
- « En attente » : nombre d'opérations locales non envoyées.
- « Synchronisation en cours » : envoi contrôlé vers Supabase.
- « À résoudre » : conflit ou opération rejetée ; ne pas supprimer l'opération sans décision explicite.
- « Synchronisé » : confirmé uniquement après réponse serveur réussie.

## Plan de réalisation et critères de validation

### Lot A — Centre des paramètres
- Ajouter une entrée depuis le profil, sans encombrer la barre principale.
- Créer les sections Compte, Atelier et équipe, Abonnement, Guide, Assistance, Informations légales, À propos.
- Afficher DTech comme éditeur.
- Adapter les sections aux rôles et vérifier les autorisations côté serveur.
- Ajouter tests unitaires des règles d'affichage par rôle et tests de navigation.

### Lot B — Mode hors ligne en lecture
- Définir précisément les champs métier autorisés en cache.
- Mettre en place une couche de cache isolée par compte et atelier, chiffrée, avec date/version de synchronisation.
- N'afficher que les dossiers effectivement téléchargés et autorisés.
- Tester le changement de compte, le changement d'atelier, l'expiration de session et le retrait d'un membre.

### Lot C — Mode hors ligne en écriture
- Implémenter une file d'attente idempotente, contrôlée par serveur, avec gestion des conflits.
- Commencer par les opérations non financières les moins risquées, après validation du lot B.
- Exclure les paiements, la caisse, les dépenses et les opérations Marketplace du mode hors ligne.
- Ajouter des tests de répétition, perte réseau pendant envoi, reconnexion, conflit et droits révoqués.

### Conditions de mise en production
- Tests automatisés et compilation réussis sur la branche.
- Vérification que les anciennes données locales ne sont ni importées ni effacées.
- Test de séparation entre deux ateliers et entre propriétaire, gestionnaire et employé.
- Test réel sur iPhone et ordinateur : ouverture hors ligne, lecture, opération en attente, reconnexion, confirmation serveur.
- Vérification du service Render de production et de la version déployée.
- Aucun merge dans `main` ni déploiement avant réussite de ces contrôles.

## Point de vigilance actuel

La présence du service worker dans `main` ne permet pas d'annoncer un « mode hors ligne complet ». Tant que les lots B et C ne sont pas réalisés et testés, présenter la fonction comme « accès à l'interface déjà chargée hors connexion », sans promettre la consultation ou la synchronisation des dossiers métier.
