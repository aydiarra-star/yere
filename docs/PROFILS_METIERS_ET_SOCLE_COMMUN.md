# Profils métiers et socle commun — YÉRÉ

**Statut :** référence produit à appliquer aux prochaines évolutions.  
**Marché de départ :** Sénégal.  
**Principe non négociable :** une seule plateforme, un socle commun et des modules adaptés aux besoins. Ne pas créer cinq applications distinctes.

## 1. Vision produit

YÉRÉ est l'assistant numérique des professionnels de la couture au Sénégal. Il aide les tailleurs, couturiers, couturières, stylistes et ateliers de confection à gérer leur activité depuis leur téléphone, avec une expérience également utilisable sur ordinateur.

Le produit doit réduire la dépendance aux cahiers, aux feuilles perdues et aux suivis dispersés. Chaque fonctionnalité est priorisée selon une question : **simplifie-t-elle réellement le travail quotidien d'un professionnel de la couture ?**

## 2. Ne pas confondre métier et structure

Le métier exercé et l'organisation du travail sont deux informations distinctes.

- **Activité principale** : tailleur, couturier, couturière, styliste ou atelier de confection.
- **Mode de travail** : indépendant, travail avec collaborateurs, ou atelier organisé en équipe.

Un styliste peut employer des couturiers ; une couturière peut diriger un atelier ; un tailleur peut travailler seul ou avec une équipe. Les permissions d'équipe doivent donc dépendre de la structure et des droits accordés, pas uniquement du métier choisi.

Le parcours peut demander une activité principale et, si utile, des activités secondaires. Ne pas bloquer un professionnel qui exerce plusieurs métiers.

## 3. Socle commun

Le socle commun partage les mêmes concepts et règles de données pour tous les profils :

1. **Clients** : coordonnées nécessaires, recherche rapide et historique.
2. **Commandes** : client, articles/vêtements, prix convenu, échéance, statut et instructions.
3. **Paiements** : acompte et versements successifs, historique traçable, solde calculé sans double comptage.
4. **Caisse** : journal compréhensible des mouvements d'argent.
5. **Dépenses** : dépenses courantes et achats, sans confusion avec les paiements clients.
6. **Stock** : articles, unités, quantités et mouvements lorsque le module est disponible.
7. **Fournisseurs** : coordonnées, achats et historique selon le périmètre livré.
8. **Tableau de bord** : informations utiles et explicables, sans chiffres inventés ni fonctionnalités annoncées comme actives avant livraison.

Le partage du socle ne signifie pas que chaque écran doit être affiché à tout le monde. L'interface met en avant les fonctions utiles au profil et laisse les autres accessibles lorsqu'elles sont activées.

## 4. Adaptations par activité

### Tailleurs
- Mensurations datées et historique conservé.
- Mesures associées au type de vêtement.
- Retouches, échéances et historique client.
- Commandes, acomptes, soldes et livraisons.

### Couturiers et couturières
- Suivi de confection et étapes de production.
- Références de tissus et fournitures utilisées, lorsque le stock est activé.
- Historique des créations et des commandes.
- Possibilité d'utiliser les mensurations lorsqu'elles sont utiles.

### Stylistes
- Fiches de créations et catalogue privé de modèles.
- Photos de référence/inspiration et liens avec le consentement approprié.
- Commandes personnalisées, consignes et relation client.
- Accès au socle commun, sans imposer les fonctions non pertinentes.

### Ateliers de confection
- Répartition des tâches et responsables.
- Suivi de production et validation des étapes.
- Membres, rôles et permissions selon les besoins.
- Stocks, achats et vue d'ensemble de l'activité.
- Ces fonctions peuvent aussi être activées pour une structure dirigée par un tailleur, une couturière ou un styliste.

## 5. Onboarding

À la première ouverture, demander en langage simple :

1. « Quelle est votre activité principale ? » — les cinq choix ci-dessus.
2. « Travaillez-vous seul ou en équipe ? » — seul, avec collaborateurs, atelier en équipe.
3. Les informations strictement nécessaires pour configurer l'espace.

L'onboarding personnalise l'accueil, les raccourcis et les suggestions ; il ne crée pas une application séparée et ne doit pas supprimer l'accès au socle commun. Permettre de modifier son profil plus tard et d'ajouter une activité secondaire sans perdre les données.

Tant qu'il n'y a pas d'authentification serveur, le profil créé dans le prototype reste local : ne pas le présenter comme un compte distant.

## 6. Modèle de données et architecture

- Enregistrer une activité principale et, si nécessaire, des activités secondaires comme des valeurs contrôlées et documentées.
- Séparer le profil métier de la structure, des membres et des permissions.
- Les données métier doivent appartenir à un atelier ; l'accès multi-atelier doit être vérifié côté serveur/base de données.
- Ne pas créer une table ou une copie des clients/commandes par métier : les entités communes doivent rester partagées.
- Les extensions spécifiques (mesures, créations, tâches d'équipe) se rattachent aux entités communes et conservent les mêmes règles d'identité, de sécurité et de traçabilité.
- Préserver la compatibilité des données existantes lors des migrations ; prévoir des valeurs par défaut sûres pour les anciens profils.
- Ne pas activer une nouvelle infrastructure distante ni changer les paramètres d'hébergement sans décision explicite.

## 7. Phases de livraison

1. **Gestion essentielle** : clients, commandes, mensurations et suivi de confection.
2. **Gestion avancée** : caisse, dépenses, stock, fournisseurs et rapprochement des opérations.
3. **Collaboration** : équipe, tâches, rôles et permissions.
4. **Marketplace YÉRÉ** : vitrines facultatives, réalisations, contact et demandes de commande.
5. **YÉRÉ AI** : recherche, statistiques explicables, aide à la gestion, voix et prise en charge progressive du wolof.

Les fondations de sécurité, de sauvegarde et d'isolation sont transversales et doivent précéder l'utilisation de données réelles, même si certaines fonctionnalités métier arrivent plus tard.

## 8. Critères d'acceptation

- Les cinq catégories professionnelles sont nommées dans le produit et sa documentation.
- Une seule application et un seul socle de données servent les cinq catégories.
- Le métier est distinct du mode de travail seul/en équipe.
- Le profil influence les raccourcis et modules mis en avant, sans enfermer l'utilisateur.
- Les modules d'équipe peuvent être activés pour toute activité qui en a besoin.
- Les clients, commandes, paiements et soldes restent cohérents quel que soit le profil.
- Les données d'un atelier ne sont pas accessibles à un autre atelier.
- Les changements de profil ne détruisent ni ne dupliquent les données.
- Les fonctionnalités non livrées sont identifiées comme prévues, pas comme disponibles.
- L'interface reste mobile-first, compréhensible et utilisable sur des appareils modestes.

## 9. Règle de décision produit

Pour chaque proposition, vérifier dans cet ordre : valeur quotidienne pour le professionnel, simplicité d'usage, cohérence avec le socle commun, sécurité et intégrité des données, coût de maintenance, dépendances et phase prévue. Une idée séduisante mais peu utile ne doit pas passer devant la fiabilité du cœur de gestion.
