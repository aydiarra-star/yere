# Plan de persistance serveur et sécurité — état réel de YÉRÉ

**Dernière revue :** 1er novembre 2026  
**Projet Supabase :** `yere`, région `eu-west-3`  
**Dépôt :** `aydiarra-star/yere`, branche `main`  
**Hébergement :** service statique Render `yere-main-preview`

> Ce document décrit l'architecture réellement présente et les contrôles effectués. Il ne certifie pas à lui seul que chaque parcours a été validé dans un navigateur avec des comptes réels.

## 1. Architecture déployée

YÉRÉ utilise désormais :
- React, TypeScript et Vite pour l'interface ;
- Supabase Auth pour les sessions ;
- PostgreSQL et l'API Supabase pour les données métier ;
- des politiques RLS et des fonctions SQL/RPC pour appliquer les droits ;
- Render Static Site pour publier le dossier `dist`.

Le projet Supabase est actif et sain selon son statut de plateforme. L'historique de production comporte 36 migrations à la date de cette revue.

## 2. Données persistées côté serveur

Le code applicatif utilise les services Supabase pour les domaines suivants :
- ateliers et membres ;
- clients et mensurations historisées ;
- commandes et paiements ;
- dépenses ;
- articles de stock et mouvements ;
- fournisseurs, profils fournisseurs, achats et règlements fournisseurs ;
- invitations d'équipe ;
- tâches affectées aux membres et historique des changements.

Les commandes et opérations financières sensibles passent par des RPC ou des règles SQL spécifiques. Le chargement des membres précède celui des données financières afin que l'interface connaisse le rôle actif avant de demander ces données.

Les données financières d'un atelier sont réservées au propriétaire dans les parcours vérifiés par les règles SQL et l'interface. Le gestionnaire et le tailleur ne reçoivent pas les mêmes informations que le propriétaire.

## 3. Isolation et sécurité

À la revue de production :
- les 17 tables du schéma `public` avaient RLS activé ;
- chacune de ces tables avait au moins une politique RLS ;
- les politiques distinguent les rôles et opérations au lieu d'accorder un accès uniforme ;
- les RPC métier publiques étaient exécutables par `authenticated`, pas par `anon` ;
- les fonctions internes privilégiées observées étaient placées dans le schéma non exposé `private` et utilisaient un `search_path` vide ;
- les règles de commande, paiement, invitations, tâches et accès financiers font l'objet de tests SQL d'intégration dans la CI.

Les politiques principales appliquent l'appartenance active à l'atelier pour les données opérationnelles. Les dépenses, paiements et achats fournisseurs sont limités au propriétaire. Les tâches sont créées par les responsables et modifiables par le responsable ou le tailleur auquel elles sont affectées, sous les contraintes métier.

### Correction de durcissement identifiée

La fonction `public.set_updated_at()` ne sert qu'à trois triggers `BEFORE UPDATE` (atelier, client et commande), mais son droit EXECUTE était encore accordé à `anon` et `authenticated`. Une migration dédiée retire ce droit inutile. Elle ne modifie ni les données, ni les politiques RLS, ni les droits sur les tables. La migration doit passer le replay CI avant son application sur la base de production.

### Alerte Auth à traiter

Le conseiller de sécurité Supabase signale que la protection contre les mots de passe compromis (Leaked Password Protection) est désactivée. Il est recommandé de l'activer dans les réglages Auth du projet si la fonction est disponible avec le plan actuel. Le connecteur utilisé pour cette revue permet de lire l'avis, mais pas de modifier ce réglage Auth.

Les 20 avis d'index inutilisés sont de niveau informatif. Aucun index n'a été supprimé : l'absence d'utilisation observée ne suffit pas à prouver qu'un index est inutile, particulièrement sur une application encore peu chargée.

## 4. Cache navigateur et données héritées

Le stockage local n'a pas disparu. `usePersistentState` conserve un cache navigateur isolé par utilisateur et, pour les données d'atelier, par atelier.

La synchronisation recharge depuis Supabase les données serveur, mais certaines fonctions conservent encore des éléments locaux :
- des commandes locales sans identifiant serveur ;
- des enregistrements historiques de dépenses, stock et achats repérés par leurs anciens préfixes ;
- les données de marketplace ;
- l'état d'onboarding et certaines préférences/propriétés locales de l'interface.

Ce mécanisme protège la continuité avec les anciennes données, mais signifie que tout n'est pas encore centralisé. Ne pas vider le stockage du navigateur, désinstaller l'application ou supprimer des clés localStorage sans export et procédure de rapprochement vérifiés.

Aucune migration automatique des données localStorage vers Supabase ne doit être improvisée : ces données résident sur les appareils des utilisateurs et ne sont pas accessibles depuis le serveur. Il faut d'abord prévoir un export contrôlé, une prévisualisation des doublons, une association au bon atelier et une confirmation explicite avant import.

## 5. Sauvegardes et restauration

Une procédure de vérification préalable des sauvegardes chiffrées a été ajoutée au dépôt (PR #111). Cette vérification ne prouve pas qu'une restauration complète de production a été exécutée avec succès.

Pendant cette revue, l'interface de gestion des sauvegardes et les points de restauration disponibles n'étaient pas accessibles par les outils connectés. Il n'est donc pas possible de certifier ici :
- la fréquence effective des sauvegardes automatiques ;
- la date de la dernière sauvegarde exploitable ;
- la rétention appliquée au plan actif ;
- la réussite d'un exercice de restauration.

À faire dans le tableau de bord Supabase, sans toucher à la base de production :
1. vérifier les sauvegardes automatiques et leur rétention selon le plan ;
2. vérifier qu'un export logique indépendant peut être généré ;
3. conserver les migrations SQL versionnées dans Git ;
4. planifier un exercice de restauration isolé, sur un environnement distinct, avant de définir un objectif de reprise.

Ne jamais tester une restauration en écrasant le projet de production.

## 6. Hébergement et déploiement

Le service Render existant est un site statique :
- nom : `yere-main-preview` ;
- dépôt : `aydiarra-star/yere` ;
- branche configurée : `main` ;
- répertoire publié : `dist` ;
- variables publiques Supabase déjà configurées (ne jamais copier leurs valeurs dans la documentation).

Le dernier déploiement contrôlé pendant la revue était `live` sur le commit `fb72aac`. Le dépôt `main` avait ensuite avancé avec la fusion de la PR #116. Le décalage doit être résorbé en vérifiant le prochain déploiement et le commit effectivement publié.

La CI GitHub utilise maintenant `npm ci`, un cache npm et exécute l'audit des dépendances, les tests et le build. Commande de build conseillée pour Render :

```bash
npm ci && npm test && npm run build
```

La configuration actuelle du service Render indique encore `npm install && npm run build`. Le changement de cette commande dans le tableau de bord Render n'a pas été effectué par le connecteur disponible ; ne pas prétendre le contraire. Le build actuel a néanmoins réussi sur le service.

## 7. Contrôles déjà réalisés

- Vérification de l'état actif du projet Supabase.
- Vérification de l'historique des migrations.
- Vérification RLS des 17 tables publiques.
- Inspection des politiques RLS et des droits d'exécution des RPC publiques.
- Vérification des fonctions privilégiées dans le schéma privé.
- Vérification des contrôles CI sur les branches de correction.
- Vérification de la configuration Render, de son dernier déploiement et des journaux de build.
- Vérification de la compilation Render et du contrôle des quatre illustrations.
- Fusion de la PR #118 : installation reproductible avec `npm ci`, cache npm et concurrence CI.

## 8. Tests de mise en service restant à exécuter dans un navigateur

Les contrôles SQL automatisés sont utiles, mais ne remplacent pas une validation des parcours avec plusieurs comptes et plusieurs appareils.

| Parcours | Contrôle attendu |
|---|---|
| Inscription, connexion, déconnexion, récupération | Session correcte, aucune donnée privée anonyme |
| Création d'atelier | Propriétaire créé et rattaché au bon atelier |
| Invitations | Invitation visible dans la boîte de réception du destinataire, acceptation et refus |
| Clients et mensurations | Création, rechargement et historique conservés |
| Commandes | Création, mise à jour du statut et persistance après reconnexion |
| Acomptes et paiements | Montants et soldes exacts ; restrictions selon le rôle |
| Dépenses et achats | Propriétaire seul pour les données financières |
| Stock | Entrées/sorties cohérentes, aucune mutation illégitime du journal |
| Tâches | Affectation, modification par l'employé affecté et historique |
| Multi-ateliers | Un compte d'un atelier ne peut lire ou modifier un autre atelier |
| Multi-appareils | Les données serveur réapparaissent après connexion sur un autre appareil |
| Cache local | Export, récupération et rapprochement des anciennes données sans perte |

Ces essais exigent des comptes de test contrôlés et une intervention dans le navigateur. Aucun compte réel de tailleur ne doit être utilisé comme compte de test sans accord.

## 9. Critères de clôture

La mise en service complète pourra être déclarée lorsque :
- les PR de documentation et de sécurité sont fusionnées après CI verte ;
- la migration de durcissement est appliquée et vérifiée en production ;
- Render publie le dernier commit de `main` et le site est contrôlé ;
- les réglages et la procédure de sauvegarde sont confirmés dans Supabase ;
- les tests navigateur multi-rôles, multi-ateliers et multi-appareils passent ;
- la stratégie de récupération des données locales héritées est validée.

**État honnête à cette date :** le socle cloud est actif et plusieurs contrôles automatisés sont en place. Le déploiement Render était en retard sur `main`, la protection des mots de passe compromis restait désactivée, les sauvegardes/restaurations n'étaient pas vérifiables via les outils connectés et les essais navigateur complets restaient à faire. Ces limites ne doivent pas être masquées par une simple compilation réussie.
