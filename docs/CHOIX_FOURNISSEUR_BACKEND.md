# Décision du backend — YÉRÉ Atelier

**Statut :** aide à la décision ; aucun fournisseur n'est choisi et aucun backend n'est créé par ce document.

## Décision à prendre avant toute donnée réelle

Choisir un environnement neuf, exclusivement consacré à YÉRÉ, avec un propriétaire des accès clairement identifié. Ne pas connecter ni réutiliser le projet Supabase « Dekk Food ».

## Options réalistes

| Critère | Supabase dédié à YÉRÉ | API + PostgreSQL sur Render |
|---|---|---|
| Authentification | Service Auth intégré ; règles d'accès à configurer et tester | À concevoir et maintenir dans l'API, ou à intégrer à un fournisseur d'identité |
| Isolation entre ateliers | Politiques RLS strictes, plus tests négatifs ; ne jamais exposer de clé privilégiée au navigateur | Contrôle serveur sur chaque route et requête ; restrictions DB en défense supplémentaire |
| Vitesse de mise en place | Généralement plus rapide pour un petit MVP | Plus de code et de responsabilités avant le pilote |
| Contrôle de l'API métier | Fonctions serveur/Edge Functions ou API séparée si nécessaire | API dédiée, adaptée aux règles métier complexes |
| Exploitation | Plusieurs services gérés à configurer et surveiller | Base et API dans l'environnement Render ; sauvegardes et sécurité à configurer selon les services choisis |
| Risque principal | Une politique RLS oubliée ou trop permissive expose des données | Une route API sans vérification d'appartenance expose des données |
| Coût | Dépend du plan, du trafic et des limites actuelles ; à vérifier au moment du choix | Dépend du plan API, de la base, des sauvegardes et de la disponibilité requise ; à vérifier au moment du choix |

Aucune option n'est sûre « par défaut » pour les données de l'atelier : la configuration, les tests d'autorisation et la restauration sont déterminants.

## Recommandation de méthode

1. Pour le prototype et un premier pilote limité, évaluer d'abord **un nouveau projet Supabase dédié à YÉRÉ**, car l'authentification et PostgreSQL géré réduisent le code d'infrastructure à écrire.
2. Ne retenir cette option que si les politiques RLS peuvent couvrir toutes les tables et relations, et si les tests d'isolation entre deux ateliers passent. Pour les opérations métier sensibles, ajouter des fonctions serveur/API plutôt que faire confiance aux valeurs du navigateur.
3. Préférer **API + PostgreSQL sur Render** si le besoin de contrôle serveur centralisé justifie le travail supplémentaire et qu'une personne est disponible pour maintenir l'authentification, les migrations, les sauvegardes et les alertes.
4. Comparer les coûts et la région d'hébergement avec les tarifs officiels au moment de créer le service ; ne pas décider sur des tarifs mémorisés ou estimés.
5. Créer des environnements séparés (développement, test, production), limiter les rôles d'administration et documenter la récupération des accès.

Cette recommandation est une piste de travail, pas une autorisation de créer un service ni une décision prise au nom du propriétaire du projet.

## Portes de validation obligatoires

Avant de connecter l'application :
- [ ] Choix du fournisseur et du responsable d'administration confirmés.
- [ ] Projet/base neuf, identifié « YÉRÉ », distinct de tout autre produit.
- [ ] Authentification et appartenance active à un atelier vérifiées côté serveur/base.
- [ ] Tests : utilisateur A ne peut ni lire ni modifier les données de B, même en changeant les identifiants envoyés.
- [ ] Migrations reproductibles depuis une base vide.
- [ ] Sauvegarde automatique configurée et restauration réelle testée.
- [ ] Secrets absents du bundle frontend et des journaux.
- [ ] Aucun jeu de données réel avant validation de toutes les portes.

## Première tranche technique après la décision

1. Créer les environnements de développement et de test.
2. Ajouter la migration initiale pour `atelier`, `atelier_membre`, `client`, `mensuration`, `commande` et `paiement`.
3. Mettre en place les tests d'accès inter-ateliers avant de migrer l'interface.
4. Relier un parcours vertical réduit : inscription/connexion → création d'atelier → création d'un client → relecture après reconnexion.
5. Ajouter sauvegarde/restauration et seulement ensuite préparer le pilote.

Voir aussi : [Contrat de sécurité backend](./CONTRAT_SECURITE_BACKEND.md) et [Feuille de route](./FEUILLE_DE_ROUTE.md).
