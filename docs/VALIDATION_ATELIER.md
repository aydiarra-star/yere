# Validation technique YÉRÉ — état vérifié

**Date du contrôle :** 2 novembre 2026  
**Dépôt de référence :** `aydiarra-star/yere` — branche `main`  
**Projet Supabase contrôlé :** YÉRÉ (`anphzspjnnhzcqzwhpsg`)

Ce document distingue les contrôles réellement exécutés des vérifications qui restent à faire. Il ne constitue pas une autorisation de lancer l'application avec des données clients réelles.

## 1. Base Supabase et migrations

Contrôle en lecture seule effectué sur le projet YÉRÉ :

- 49 migrations sont enregistrées dans l'historique Supabase.
- 24 tables publiques sur 24 ont RLS activé.
- Les versions appliquées comprenaient notamment les migrations `20261102083227`, `20261102085838`, `20261102093821`, `20261102094043`, `20261102124930` et `20261102133933`.
- La branche de réconciliation contient maintenant 49 fichiers de migration dont les versions et noms correspondent exactement aux 49 entrées de l'historique Supabase. Les deux migrations de droits du profil atelier sont conservées dans le dépôt sous leurs versions déjà appliquées. Il ne faut pas les réappliquer à la base de production.
- Le rejeu intégral des migrations a réussi dans le job CI isolé après réalignement.

## 2. Droits du profil atelier — contrôle SQL exécuté

La vérification `has_column_privilege` sur le rôle `authenticated` a confirmé :

| Champ | INSERT | UPDATE |
|---|---:|---:|
| `id` | autorisé | refusé |
| `nom` | autorisé | autorisé |
| `telephone` | autorisé | autorisé |
| `ville` | autorisé | autorisé |
| `devise` | refusé | refusé |

Les horodatages restent contrôlés par le serveur. Les règles RLS continuent de déterminer quels membres peuvent modifier la ligne de leur atelier.

## 3. Application et abonnement

Dans `main`, l'écran Profil utilise déjà `updateAtelierProfile` et confirme la mise à jour à partir de la réponse du serveur. Le composant affiche le statut d'abonnement, les dates d'essai/échéance et le tarif convenu de 5 000 FCFA par atelier et par mois. L'historique des paiements est déjà présent dans cette version de `main`.

Aucun paiement en ligne ni prélèvement automatique ne doit être annoncé comme actif sans intégration et confirmation côté serveur.

## 4. YÉRÉ Market

Contrôle en lecture seule effectué :

- 0 profil vendeur ;
- 0 annonce ;
- 0 commande Marketplace.

Le catalogue est donc techniquement préparé mais n'est pas encore un marché alimenté. Ne pas créer de fausses annonces pour remplir la vitrine. Les fiches de l'ancien éditeur local ne doivent pas être présentées comme des annonces publiques.

## 5. Contrôles de sécurité Supabase

L'advisor Supabase signale six fonctions `SECURITY DEFINER` exécutables par les utilisateurs connectés. Le contrôle des définitions réellement déployées a confirmé pour les six fonctions :

- exécution interdite à `anon` ;
- `search_path` fixé à une valeur vide ;
- vérification de `auth.uid()` et de l'identité/droits du demandeur avant l'action ou la restitution de données.

Ces fonctions servent aux commandes Marketplace, à la messagerie et à l'accès limité aux coordonnées de son propre profil vendeur. Ne pas révoquer globalement leur exécution ni les convertir mécaniquement en `SECURITY INVOKER`, ce qui casserait les opérations qui doivent écrire dans des tables protégées par RLS. Conserver leur revue dans les contrôles de sécurité futurs.

La protection contre les mots de passe compromis est désactivée. L'organisation Supabase est actuellement sur le plan Free ; la documentation Supabase indique que cette fonction est disponible sur Pro et au-dessus. Aucune montée de plan n'a été demandée ni effectuée. Ce signalement reste donc une limitation connue, sans achat imposé.

L'advisor performance signale 29 index non encore utilisés. Ne pas les supprimer : le faible volume actuel de données et l'absence d'activité Marketplace ne permettent pas de conclure qu'ils sont inutiles.

## 6. État des comptes réellement présents — contrôle agrégé en lecture seule

Au moment du contrôle :

- 3 ateliers enregistrés ;
- 3 membres avec rôle Propriétaire et 2 avec rôle Gestionnaire ;
- aucun membre avec rôle Employé ;
- 2 invitations déjà acceptées ;
- 3 abonnements en période d'essai ;
- aucun vendeur, aucune annonce et aucune commande Marketplace.

Ces nombres sont des agrégats ; aucune adresse e-mail, identité, commande ou donnée client n'a été extraite pour ce contrôle. Ils ne prouvent pas que les parcours ont été testés en situation réelle avec chaque rôle.

## 7. Vérifications automatisées et déploiement

- [x] Rejeu complet des migrations sur une base CI vierge après réalignement des versions.
- [x] Build et tests automatisés verts sur le commit de la PR #154.
- [x] Déploiement Render du commit de fusion `f337b93b98ad3057e0c33cdeb9243d309d0c4fea`, statut `live`, sur le service de prévisualisation `yere-main-preview`.
- [x] Vérification RLS sur les 24 tables publiques.
- [x] Vérification SQL des règles financières et des six fonctions Marketplace privilégiées.

## 8. À valider avant un pilote avec des données réelles

- [ ] Tests réels avec comptes Propriétaire, Gestionnaire et Employé distincts.
- [ ] Isolation confirmée en situation réelle entre deux ateliers distincts.
- [ ] Caisse, versements et dépenses invisibles aux Gestionnaires et Employés après connexion réelle.
- [ ] Clients, mensurations, commandes, stocks et achats retrouvés après actualisation et reconnexion sur appareils distincts.
- [ ] Market testé avec un vendeur tailleur, un vendeur fournisseur et un acheteur distincts.
- [ ] Commandes et conversations accessibles uniquement à leurs participants réels.
- [ ] Restauration complète d'une sauvegarde chiffrée testée dans un environnement isolé.
- [ ] Parcours invitation, récupération de mot de passe et confirmation d'e-mail vérifiés de bout en bout.
- [ ] Réglage de protection contre les mots de passe compromis réévalué si le plan Supabase change.

**Règle de lancement :** tant que les tests multi-rôles réels, l'isolation multi-ateliers en situation réelle et la restauration isolée ne sont pas validés, limiter le pilote à des données fictives ou explicitement non sensibles. Le service Render actuellement déployé est une prévisualisation, pas une confirmation de mise en production.
