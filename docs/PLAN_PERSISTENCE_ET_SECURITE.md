# Plan d'intégration de la persistance serveur — YÉRÉ

**Statut :** préparation technique, non déployée. Ce document ne signifie pas qu'un projet Supabase existe ou qu'une base a été créée.

## Objectif du prochain incrément

Remplacer progressivement le stockage local de démonstration par une persistance serveur authentifiée, sans perdre les tests et sans exposer les données d'un atelier à un autre.

## Décisions de sécurité non négociables

- Chaque ligne métier porte un atelier_id non nul.
- L'utilisateur doit être membre actif de l'atelier concerné ; être simplement connecté ne suffit pas.
- Les contrôles d'accès sont appliqués par PostgreSQL/RLS, pas uniquement dans l'interface React.
- Les politiques UPDATE vérifient l'accès à la ligne existante (USING) et interdisent de déplacer la ligne vers un autre atelier (WITH CHECK).
- Aucune clé service_role ou clé secrète n'est placée dans le code client, le dépôt ou une variable VITE_*.
- Les paiements sont des événements traçables ; le solde est calculé à partir du prix convenu et des paiements nets.
- Les mensurations sont historisées par profil daté : une nouvelle prise de mesures ne détruit pas l'ancienne.
- Pas de vraies données de clients dans le prototype local.

## Périmètre du premier lot serveur

1. Authentification et fermeture de session.
2. Atelier et appartenance utilisateur (owner, puis staff si confirmé par le pilote).
3. Clients et archivage non destructif.
4. Profils de mensurations historisés.
5. Commandes et journal des changements de statut.
6. Paiements d'une commande et calcul du solde.
7. Tests d'isolation entre deux ateliers.

Les dépenses, stocks, fournisseurs et marketplace restent hors de ce premier lot pour éviter de retarder le cœur de gestion.

## Ordre de réalisation

1. Confirmer l'espace/projet Supabase cible et vérifier qu'il est bien destiné à YÉRÉ.
2. Vérifier la documentation Supabase actuelle et les réglages de l'API de données.
3. Créer une migration avec la CLI Supabase (supabase migration new ...) dans un environnement de développement.
4. Créer les tables, clés étrangères composites ou contrôles équivalents garantissant que client, commande, paiement et événement appartiennent au même atelier.
5. Activer RLS sur toutes les tables du schéma exposé et écrire des politiques distinctes pour lecture, insertion, modification et archivage.
6. Tester les accès avec deux utilisateurs appartenant à deux ateliers distincts, y compris les tentatives d'accès direct par identifiant et de changement d'atelier_id.
7. Exécuter les tests de sécurité/advisors et les tests d'intégration avant de connecter l'interface.
8. Ajouter les variables d'environnement publiques nécessaires localement ; conserver toute clé secrète côté serveur uniquement.
9. Remplacer une fonctionnalité à la fois dans l'interface et conserver le mode démo clairement identifié jusqu'à validation.

## Critères d'acceptation avant d'utiliser des données réelles

- [ ] Un utilisateur non connecté ne lit aucune donnée privée.
- [ ] Un membre de l'atelier A ne peut ni lire, ni modifier, ni supprimer les données de l'atelier B.
- [ ] Un utilisateur ne peut pas changer l'atelier propriétaire d'une ligne en modifiant son payload.
- [ ] Un paiement ne peut pas être attaché à une commande d'un autre atelier.
- [ ] Les mesures précédentes restent consultables après une nouvelle prise de mesures.
- [ ] Le solde affiché est cohérent avec le prix et l'ensemble des paiements/corrections.
- [ ] Tests, build, migrations et vérifications de sécurité passent sur un environnement de test.
- [ ] Une procédure de sauvegarde, export et suppression des données est documentée.

## État actuel

Le prototype de la PR #5 conserve clients, mesures et commandes dans le stockage local du navigateur. Il n'y a pas encore d'authentification, de synchronisation, de base de données distante ni d'isolation multi-atelier. Ne pas déployer ce prototype en production et ne pas y saisir de données personnelles réelles.
