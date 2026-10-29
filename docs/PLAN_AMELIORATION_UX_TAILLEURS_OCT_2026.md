# YÉRÉ Atelier — plan d'amélioration UX métier (octobre 2026)

## Garde-fous
- Conserver React, TypeScript, Vite, les modules et les données existants.
- Aucune suppression de fonctionnalité ni refonte globale.
- Priorité exclusive aux tailleurs et ateliers de couture.
- Les données restent locales dans cette version : ne pas présenter l'application comme prête pour des données réelles avant authentification, stockage serveur, sauvegardes et isolation multi-atelier.

## Les 10 améliorations prioritaires

| Priorité | Amélioration | Problème terrain et amélioration concrète | Impact | Difficulté |
|---|---|---|---|---|
| 1 | Tableau de bord du jour | Le tailleur doit savoir quoi faire en ouvrant l'application. Afficher en premier les livraisons du jour, les retards et les tenues prêtes à remettre. | Fort | Faible |
| 2 | Retards visibles | Les commandes en retard se perdent dans une longue liste. Ajouter un indicateur textuel « En retard de X jours » et un filtre dédié. | Fort | Faible |
| 3 | Solde sur chaque commande | Les acomptes et paiements partiels sont difficiles à suivre mentalement. Montrer prix, payé, reste à payer et statut financier au même endroit. | Fort | Faible |
| 4 | Acompte guidé | Les erreurs de calcul peuvent créer des désaccords. Afficher le solde après acompte et empêcher un acompte supérieur au prix restant. | Fort | Faible |
| 5 | Mesures incomplètes | Une mesure oubliée peut retarder ou gâcher une tenue. Calculer les champs attendus selon le vêtement et afficher « X mesures à compléter ». | Fort | Moyen |
| 6 | Historique des mensurations | Les clients changent de taille et les anciennes mesures peuvent être utiles. Rendre la date et le type de vêtement visibles et conserver chaque version. | Fort | Moyen |
| 7 | Fiche client rapide | La recherche doit fonctionner par nom ou téléphone, sans parcours compliqué. Garder une action « Nouveau client » toujours visible et un accès rapide à ses commandes et mesures. | Fort | Faible |
| 8 | Relance des tenues prêtes | Les vêtements terminés peuvent rester dans l'atelier. Créer une liste « À récupérer » avec date de disponibilité et action de relance manuelle/copier-message; automatiser l'envoi seulement après consentement et configuration. | Fort | Moyen |
| 9 | Progression de confection | Le tailleur doit repérer rapidement ce qui reste à faire. Utiliser des étapes courtes et compréhensibles, modifiables depuis la liste sans ouvrir chaque fiche. | Fort | Moyen |
| 10 | Bilan hebdomadaire simple | Il est difficile de savoir si l'atelier avance et encaisse bien. Montrer commandes livrées, commandes en cours, retards, encaissements et soldes clients, sans comptabilité complexe. | Moyen | Faible |

## Plan MVP sur 30 jours

### Jours 1–7 — Clarté immédiate
- Tableau de bord « Aujourd'hui » avec livraisons et retards.
- Indicateurs textuels accessibles, filtres « Aujourd'hui », « En retard », « Prêtes ».
- Harmonisation des tailles, espacements, contrastes, boutons et états focus.
- Tests des dates limites et affichage sur petits écrans.

### Jours 8–14 — Argent sans ambiguïté
- Prix, total payé, acompte et solde sur chaque commande.
- Calculs réutilisant les fonctions métier existantes; pas de doublon de logique.
- Confirmation avant correction d'un paiement et historique conservé.
- Tests des paiements partiels, paiement complet et dépassement refusé.

### Jours 15–21 — Clients et mesures fiables
- Signal de mesures manquantes selon le vêtement.
- Historique de mensurations daté et copie des mesures utilisées par commande.
- Recherche et fiche client optimisées pour le téléphone.
- Parcours de création client → mensurations → commande vérifié.

### Jours 22–30 — Livraison et fidélisation
- Liste « Tenues prêtes à récupérer » et relance manuelle guidée.
- Étapes de confection lisibles, indicateurs de progression.
- Bilan hebdomadaire simple et guide d'essai terrain.
- Tests de non-régression, accessibilité clavier et responsive; déploiement en prévisualisation pour validation.

## Évolution sur 6 mois
- **Mois 1 :** priorités métier du MVP ci-dessus et validation avec des tailleurs.
- **Mois 2 :** sauvegarde/restauration plus sûre et préparation de la persistance serveur; audit de confidentialité.
- **Mois 3 :** comptes, authentification et isolation stricte par atelier avant toute donnée réelle.
- **Mois 4 :** relances configurables et consenties, modèles de messages adaptés aux usages locaux; aucune promesse d'envoi automatique sans canal réellement intégré.
- **Mois 5 :** stocks et achats seulement si les retours terrain confirment leur utilité; alertes simples de fournitures faibles.
- **Mois 6 :** bilan d'adoption, amélioration de performance mobile, tests sur téléphones modestes et plan de corrections basé sur les retours réels.

## Fonctions à masquer ou déprioriser pour ne pas surcharger
- Marketplace publique et publication d'annonces : accès secondaire, sans la mettre dans la navigation principale du quotidien.
- Fournisseurs et achats avancés : dans « Plus » tant que le cœur commandes/paiements n'est pas validé.
- Indicateurs financiers avancés et statistiques secondaires : afficher seulement les chiffres nécessaires au quotidien.
- Paramètres rarement utilisés : dans « Mon atelier » ou « Plus ».
- Ne supprimer aucune fonction ni aucune donnée : seulement réduire leur visibilité dans le parcours principal.

## Principes d'interface premium 2026
- Mobile-first, fond clair, bleu cohérent, cartes discrètes, espaces maîtrisés et boutons principaux évidents.
- Une seule famille de texte pour l'interface courante, hiérarchie stable et caractères secondaires lisibles (viser au moins 11–12 px pour les informations utiles).
- Titres sur une ligne lorsque possible; tronquer proprement plutôt que faire déborder le contenu. Ne jamais couper les montants, les dates ou les noms nécessaires à une décision.
- Navigation principale limitée aux tâches fréquentes; fonctions secondaires regroupées sans être supprimées.
- Cibles tactiles confortables, contraste suffisant, états vides explicites, messages d'erreur en langage simple.
- Pas de données fictives qui pourraient être prises pour des données réelles.

## Proposition de valeur
**YÉRÉ aide chaque tailleur à retrouver ses clients, suivre ses commandes, maîtriser ses acomptes et livrer ses tenues à temps, depuis un téléphone et sans calculs compliqués.**

## Limites de la version actuelle à garder visibles
Le dépôt indique que les données sont encore conservées dans le stockage local du navigateur et qu'il n'y a pas encore d'authentification réelle, de sauvegarde distante ni d'isolation multi-atelier. La prévisualisation est donc destinée aux tests avec données fictives, pas à la production.
