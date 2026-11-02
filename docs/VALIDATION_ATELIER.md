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

L'advisor Supabase a signalé :

- six fonctions `SECURITY DEFINER` accessibles au rôle authentifié ;
- la protection contre les mots de passe compromis désactivée.

Les fonctions Marketplace sont des points d'entrée utilisés par l'application et certaines vérifient explicitement `auth.uid()` et les droits du demandeur. Le signalement de l'advisor doit être examiné fonction par fonction : ne pas révoquer globalement leur exécution, ce qui casserait les parcours Marketplace. La protection contre les mots de passe compromis dépend d'un réglage Auth du projet.

## 6. À valider avant un pilote avec des données réelles

- [ ] Rejeu complet des migrations sur une base CI vierge après réalignement des versions.
- [ ] Build et tests automatisés verts sur le commit final.
- [ ] Tests réels avec comptes Propriétaire, Gestionnaire et Employé distincts.
- [ ] Isolation confirmée entre deux ateliers.
- [ ] Caisse, versements et dépenses invisibles aux Gestionnaires et Employés.
- [ ] Clients, mensurations, commandes, stocks et achats retrouvés après actualisation et reconnexion.
- [ ] Market testé avec un vendeur tailleur, un vendeur fournisseur et un acheteur distincts.
- [ ] Commandes et conversations accessibles uniquement à leurs participants.
- [ ] Restauration complète d'une sauvegarde chiffrée testée dans un environnement isolé.
- [ ] Parcours invitation, récupération de mot de passe et confirmation d'e-mail vérifié.

**Règle de lancement :** tant que les tests multi-rôles, l'isolation multi-ateliers et la restauration isolée ne sont pas validés, limiter le pilote à des données fictives ou explicitement non sensibles.
