# Validation avant pilote

Le projet Supabase dédié à YÉRÉ existe déjà et contient le socle de données installé. Cette checklist suit maintenant la validation fonctionnelle et de sécurité ; elle ne demande ni de recréer le projet ni de réappliquer les migrations existantes.

## État vérifié le 31 octobre 2026

- Projet Supabase : `yere`, région `eu-west-3`, état `ACTIVE_HEALTHY`.
- 31 migrations enregistrées.
- 15 tables publiques, toutes avec RLS activé.
- 41 politiques RLS.
- 2 comptes Auth, 2 ateliers et 3 appartenances présentes.
- Projet sur le forfait Free.

## Tests RLS effectués (simulation de rôle PostgreSQL)

Les tests ont été exécutés dans des transactions annulées ensuite ; aucune donnée métier de test n'a été conservée.

- Un membre voit les 2 clients de son atelier : réussi.
- Le même compte ne voit aucun client ni aucune commande d'un autre atelier : réussi.
- Un compte non membre ne voit aucune dépense de l'autre atelier : réussi.
- Le rôle gestionnaire voit les clients mais ne voit ni les paiements ni les dépenses : réussi.
- Le rôle propriétaire voit les paiements de son atelier : réussi.
- Le propriétaire peut inviter un employé ou un gestionnaire : réussi en transaction annulée.
- Le gestionnaire peut inviter un employé mais ne peut pas promouvoir/inviter un autre gestionnaire : réussi en transaction annulée.
- Le propriétaire ne peut pas inviter dans un atelier dont il n'est ni membre ni gestionnaire : refusé en transaction annulée.
- Une adresse e-mail mal formée est refusée par la fonction SQL : réussi.
- La boîte de réception RLS ne montre l'invitation qu'à l'adresse invitée ; une autre adresse ne la voit pas : réussi en transaction annulée avec une identité JWT simulée.
- Simulation temporaire du rôle employé : l'acompte initial est refusé, la modification du prix d'une commande est refusée, la création d'une commande sans acompte est autorisée ; transaction annulée et rôle restauré ensuite.

Ces contrôles SQL valident des règles RLS et des fonctions en contexte PostgreSQL simulé. Ils ne remplacent pas encore les tests navigateur avec les vrais jetons Auth ni le parcours d'invitation complet. Aucun compte employé permanent n'est encore disponible pour un test utilisateur réel.

## Configuration Render vérifiée

- Service principal de prévisualisation : `yere-main-preview`.
- Dépôt : `aydiarra-star/yere`, branche `main`.
- Variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` configurées sur ce service avec les valeurs publiques du projet Supabase YÉRÉ.
- Redéploiement déclenché après configuration : terminé avec succès le 31 octobre 2026 à 15:44:57 UTC.
- URL : https://yere-main-preview.onrender.com

Les autres services Render YÉRÉ n'ont pas été modifiés. Le build de ce service exécute actuellement `npm install && npm run build` ; les tests Vitest ne sont donc pas encore lancés automatiquement par ce service.

## Alerte Supabase restante

L'advisor de sécurité signale que la protection contre les mots de passe compromis est désactivée. La documentation Supabase indique que cette option est disponible à partir du forfait Pro ; le projet est actuellement en Free. Ne pas présenter cette option comme activable gratuitement. Conserver des mots de passe d'au moins 8 caractères et envisager le changement de forfait uniquement si cette protection devient nécessaire.

## Contrôles restant à exécuter

- Vérifier depuis un navigateur que les deux comptes existants se connectent au service Render principal.
- Tester l'inscription, la confirmation e-mail, la déconnexion, le renouvellement de session et la récupération de mot de passe.
- Tester les invitations de bout en bout avec deux boîtes e-mail contrôlées : réception dans la boîte de réception intégrée, acceptation, refus, annulation et expiration. Les tests SQL transactionnels couvrent déjà les autorisations de création, mais pas le parcours complet avec deux vrais comptes distincts. La création d’une invitation enregistre actuellement une ligne en base mais n’envoie pas automatiquement d’e-mail ; le destinataire doit se connecter avec la même adresse et ouvrir « Boîte de réception » dans la barre de session.
- L’invitation actuellement présente dans la base est déjà acceptée ; elle n’apparaît donc plus dans la liste des invitations en attente.
- Tester chaque rôle avec de vrais comptes Auth, dont un employé permanent.
- Vérifier les paiements et les achats fournisseurs avec des montants fictifs, y compris les doublons et dépassements de solde.
- Ajouter l'exécution de `npm test` au contrôle CI/build avant d'ouvrir le pilote.
- Faire une revue finale des fonctions privilégiées, des sauvegardes et des journaux.

## Passage au pilote

Consigner les résultats des tests navigateur, corriger chaque échec et examiner les alertes avant tout déploiement ou import de données réelles. Ne pas appliquer de migration supplémentaire sans vérifier d'abord qu'elle n'est pas déjà enregistrée dans le projet.
