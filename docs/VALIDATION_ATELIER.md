# Validation avant pilote

YÉRÉ ne doit pas recevoir de données réelles avant la validation de l'authentification, des rôles et de l'isolation entre ateliers.

## Environnement
- Utiliser un projet Supabase de développement dédié à YÉRÉ.
- Tester uniquement avec des comptes et données fictifs.
- Ne pas appliquer les migrations à une base de production.

## Contrôles
- Un utilisateur non connecté ne lit ni n'écrit de données privées.
- Un membre d'un atelier ne peut pas consulter ou modifier les données d'un autre atelier.
- Seuls les rôles autorisés peuvent enregistrer un acompte.
- Les montants et l'appartenance du client sont vérifiés côté serveur.
- Les requêtes répétées ne créent pas de doublons.
- Les règles d'accès sont testées avec des comptes de chaque rôle, pas avec un compte administrateur.

## Passage au pilote
Consigner les résultats, corriger chaque échec et faire une revue des migrations avant tout déploiement ou import de données réelles.
