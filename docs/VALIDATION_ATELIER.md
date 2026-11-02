# Validation technique avant pilote — YÉRÉ

**État vérifié : 2 novembre 2026**  
**Dépôt de référence :** `aydiarra-star/yere` — branche `main`  
**Projet Supabase :** `yere` — région `eu-west-3`

## 1. État Supabase vérifié

- Projet actif.
- 46 migrations enregistrées dans Supabase.
- 24 tables publiques sur 24 avec RLS activé.
- 59 politiques RLS.
- 3 comptes Auth, 3 ateliers et 5 appartenances.
- 3 abonnements d'atelier en essai, au tarif enregistré de 5 000 FCFA par mois.

Le dépôt de travail associé à la PR #144 contient 46 fichiers de migration dont les versions correspondent aux 46 versions enregistrées dans Supabase. Les deux migrations récentes de sécurité du profil atelier sont déjà appliquées au projet.

## 2. Sécurité et permissions

### Ateliers et équipe

- Les données sont isolées par atelier.
- Le propriétaire seul accède aux paiements, dépenses et montants financiers.
- Les Gestionnaires et Employés ne doivent pas voir les informations financières.
- Les tâches peuvent être attribuées aux membres de l'atelier.
- Le propriétaire et le gestionnaire peuvent modifier le profil de l'atelier ; l'employé ne le peut pas.
- Les droits SQL du profil atelier limitent les écritures aux champs nom, téléphone et ville ; l'identifiant, la devise et les horodatages restent protégés.

### YÉRÉ Market

- Le catalogue public lit uniquement les champs de vitrine autorisés.
- Les noms de contact, téléphones, identifiants utilisateur et identifiants d'atelier des vendeurs ne sont pas lisibles par les rôles publics ou acheteurs.
- Un vendeur peut modifier les champs autorisés de sa vitrine, mais pas son statut de modération ni son rattachement à un atelier.
- Les contacts privés sont servis au vendeur par une fonction limitée à son propre compte.
- Les fonctions privilégiées contrôlées utilisent un `search_path` vide et vérifient l'identité et les droits du demandeur.

Les tests SQL du dépôt couvrent les rôles, l'isolation entre deux ateliers, la confidentialité des finances et les parcours Market avec des identités synthétiques. Ils s'exécutent sur une base isolée et leurs transactions sont annulées.

## 3. État du Market

Le projet Supabase contient actuellement :

- 0 profil vendeur ;
- 0 annonce ;
- 0 commande marketplace.

Le parcours et les tables sont présents, mais le catalogue de production est vide. Il faut recruter les premiers tailleurs et fournisseurs, puis publier leurs offres réelles avec leur accord. Ne pas créer de fausses annonces pour donner l'impression que le marché est actif.

Les anciennes fiches de la vitrine interne restent des brouillons locaux dans les navigateurs où elles existent ; elles ne sont pas publiées automatiquement dans le Market public.

## 4. Abonnement

- L'essai de deux mois et le tarif de 5 000 FCFA par atelier et par mois sont enregistrés.
- L'écran propriétaire affiche l'essai et sa date de fin dans le chantier de la PR #144.
- L'équipe entière est incluse dans le tarif de l'atelier.
- Aucun prestataire de paiement en ligne n'est sélectionné.
- Aucun prélèvement automatique n'est activé ; aucune facturation réelle ne doit être déclenchée sans décision explicite.

## 5. Render et déploiement

Service identifié dans l'espace Render : `yere-main-preview`.

- Dépôt : `aydiarra-star/yere`.
- Branche configurée : `main`.
- Auto-déploiement activé.
- Dernier déploiement réussi observé : commit `870160a`, le 2 novembre 2026 à 08:49 UTC.
- La branche `main` contient depuis le commit `65bdff4` le correctif de confidentialité des vendeurs ; le service Render n'avait pas encore de déploiement correspondant au moment de cette vérification.
- Aucun service de production YÉRÉ distinct n'a été identifié dans l'espace Render consulté.

Ne pas considérer le correctif comme visible dans l'application tant que le déploiement de la branche `main` n'a pas été confirmé.

## 6. Invitations et authentification

- L'invitation d'équipe est enregistrée dans la base et consultable dans la boîte de réception intégrée.
- L'invité doit se connecter avec la même adresse e-mail que celle ciblée par l'invitation.
- L'envoi automatique d'un e-mail d'invitation n'est pas encore activé.
- Le parcours complet avec deux vrais comptes de test distincts reste à vérifier dans un navigateur.

## 7. Sauvegardes et limites connues

- Le workflow de sauvegarde chiffrée est présent dans GitHub Actions.
- Le dépôt ne contient pas encore de workflow de restauration complète.
- La restauration d'une sauvegarde avec sa clé de déchiffrement sur un environnement isolé reste à tester avant le stockage de données clients réelles.
- La protection contre les mots de passe compromis est signalée désactivée par l'advisor Supabase ; elle dépend d'une option non disponible sur le forfait Free. Aucun changement payant n'a été engagé.

## 8. Tests encore obligatoires avant pilote réel

- [ ] Terminer le replay complet des 46 migrations sur une base CI vide.
- [ ] Confirmer le succès de Vitest et du build sur le dernier commit de la PR #144.
- [ ] Confirmer le déploiement Render de la branche `main` et ouvrir l'application dans un navigateur.
- [ ] Tester propriétaire, gestionnaire et employé avec des comptes de test distincts.
- [ ] Tester deux ateliers et vérifier qu'aucune donnée ne traverse les frontières d'atelier.
- [ ] Vérifier que la caisse et les montants sont invisibles aux Gestionnaires et Employés.
- [ ] Créer, modifier et retrouver après actualisation des clients, mensurations, commandes, tâches, stocks et achats.
- [ ] Tester inscription, confirmation e-mail, récupération du mot de passe, invitation, acceptation et révocation.
- [ ] Tester une boutique tailleur, une boutique fournisseur, une annonce publique, une commande et une conversation avec des comptes distincts.
- [ ] Réaliser une restauration complète d'une sauvegarde chiffrée dans un environnement isolé.

**Décision :** YÉRÉ progresse vers le pilote, mais ne doit pas encore être présenté comme entièrement prêt à accueillir des données réelles. Les validations navigateur, le replay CI, le déploiement du dernier commit et la restauration complète restent des conditions de feu vert.
