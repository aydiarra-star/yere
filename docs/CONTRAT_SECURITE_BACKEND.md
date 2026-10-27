# Contrat de sécurité backend — YÉRÉ Atelier

**Statut :** spécification de travail, indépendante du fournisseur. Ce document ne signifie pas qu'un backend est déjà provisionné.

## Objectif et règle de blocage

Aucune donnée réelle de client, mensuration, commande ou paiement ne doit être introduite tant que l'authentification, l'isolation entre ateliers, les sauvegardes et la restauration n'ont pas été testées. Le stockage navigateur actuel reste un prototype de démonstration.

## Architecture cible minimale

1. **Frontend** : React/TypeScript ; ne contient aucun secret serveur.
2. **Authentification** : identité vérifiée par un fournisseur dédié ; aucune confiance accordée à un identifiant d'atelier transmis librement par le navigateur.
3. **API / base relationnelle** : chaque enregistrement métier appartient à un atelier ; le serveur déduit les autorisations de l'identité authentifiée.
4. **Autorisation** : contrôle côté serveur pour chaque lecture, création, modification et suppression ; politiques de base de données en défense supplémentaire si le fournisseur le permet.
5. **Migrations versionnées** : schéma reproductible depuis un environnement vide ; changements revus et appliqués dans l'ordre.
6. **Sauvegardes et restauration** : sauvegardes automatiques, durée de rétention documentée, accès restreint et exercice de restauration avant le pilote.

Le choix du fournisseur reste à confirmer. Le projet Supabase existant nommé « Dekk Food » est hors périmètre et ne doit pas être réutilisé.

## Modèle d'autorisation à imposer

- `atelier` : identité et paramètres de l'atelier.
- `atelier_membre` : relation entre utilisateur et atelier, avec rôle.
- `client`, `mensuration`, `commande`, `paiement` : chaque ligne métier contient un `atelier_id` non nul.
- Les paiements sont des événements distincts : montant, date, commande, auteur et éventuelle annulation traçable. Ne pas confondre prix convenu, acompte prévu et sommes effectivement encaissées.
- Les mensurations sont datées et historisées ; une nouvelle prise ne remplace pas silencieusement l'ancienne.
- Les suppressions sensibles doivent suivre une règle de conservation explicite et ne pas casser les totaux financiers.

## Contrôles de sécurité obligatoires

- Aucun secret privilégié ou clé d'administration dans le bundle frontend, le dépôt ou les journaux.
- Validation serveur des types, montants, dates, identifiants et transitions de statut ; les contrôles React ne suffisent pas.
- Refus par défaut si l'utilisateur n'a pas d'appartenance active à l'atelier ciblé.
- Les lectures et écritures vérifient l'appartenance à l'atelier, y compris pour les sous-ressources et les relations.
- Les erreurs publiques ne révèlent ni données d'un autre atelier, ni secrets, ni détails internes.
- Limiter les données personnelles au nécessaire ; définir accès, export, correction et suppression.
- Les opérations sensibles (paiement, changement de rôle, suppression) doivent être traçables.
- Les fichiers et photos éventuels restent privés par défaut ; aucun lien public permanent.
- Les journaux techniques ne contiennent pas de mensurations, de numéros de téléphone complets ou de secrets.

## Tests d'acceptation bloquants

1. Utilisateur A crée un atelier A et ne peut lire, modifier ni supprimer aucune donnée de l'atelier B.
2. Modifier manuellement un `atelier_id` dans une requête ne permet pas de contourner les droits.
3. Un utilisateur non authentifié ne peut accéder à aucune donnée métier privée.
4. Un membre retiré perd l'accès lors de la requête suivante.
5. Les montants négatifs, dates impossibles, références inexistantes et transitions de statut interdites sont rejetés côté serveur.
6. Un paiement est enregistré une seule fois ; une répétition de requête ne crée pas de double encaissement.
7. Une sauvegarde peut être restaurée dans un environnement isolé ; le nombre de clients, commandes et paiements est rapproché après restauration.
8. Une migration depuis une base vide et une mise à niveau depuis la version précédente réussissent en CI.
9. Les secrets de production sont absents du code compilé et des logs.
10. Les tests d'accès et de restauration sont rejouables et leur résultat est conservé avant chaque pilote.

## Ordre de livraison

- **B0 — Décision** : confirmer fournisseur, régions, budget, environnements et responsable des accès.
- **B1 — Socle** : créer un environnement YÉRÉ séparé, configurer les secrets côté serveur et la migration initiale.
- **B2 — Isolation** : authentification, appartenance atelier et politiques d'accès ; réussir les tests inter-ateliers.
- **B3 — Données métier** : clients, mensurations historisées, commandes et paiements avec validations serveur.
- **B4 — Continuité** : sauvegarde automatisée, restauration vérifiée et procédure d'incident.
- **B5 — Pilote** : seulement après réussite de tous les contrôles bloquants, inviter un petit nombre d'ateliers et utiliser des données réelles avec consentement.

## Ce qui n'est pas encore fait

Ce contrat est une checklist d'acceptation. Aucun backend YÉRÉ dédié, compte utilisateur, politique d'isolation, paiement serveur ou test de restauration n'est déclaré implémenté. La prochaine action technique dépend du choix explicite d'un environnement dédié ; ne pas créer ni réutiliser un projet de production par supposition.
