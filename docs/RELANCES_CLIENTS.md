# Module Relances clients — proposition produit

## Promesse
Faire de YÉRÉ un outil qui aide l'atelier à générer des commandes récurrentes, pas seulement à enregistrer celles qui existent. Le module transforme l'historique de commandes en occasions de reprendre contact, tout en laissant le tailleur décider qui contacter et quand.

## Problèmes à résoudre
- Les clients satisfaits oublient parfois de revenir vers le même atelier.
- Les commandes de cérémonie sont saisonnières et demandent de l'anticipation.
- Les tailleurs n'ont pas toujours le temps de rechercher manuellement les anciens clients.
- Les messages génériques peuvent paraître insistants ou inappropriés.

## Expérience MVP
1. **Carnet de relance** accessible depuis la navigation principale.
2. **Suggestions expliquées** : chaque proposition montre la règle qui l'a déclenchée, la date et la commande source.
3. **Réactivation après inactivité** : suggestion après 180 jours sans commande datée, seuil à rendre configurable plus tard.
4. **Souvenir d'occasion** : si un ancien vêtement est associé à un mariage, baptême, Tabaski, Korité ou rentrée, proposer une reprise de contact à l'approche d'une période pertinente. Les fêtes religieuses suivent un calendrier lunaire : les dates de campagne doivent être fournies/confirmées par l'atelier ou par un calendrier vérifié, jamais codées comme dates fixes annuelles.
5. **Message suggéré et personnalisable** : ton poli, court, sans pression. L'atelier relit et copie le texte dans cette première version.
6. **Coordonnées manquantes** : afficher l'opportunité mais désactiver la copie/prise de contact si aucun téléphone n'est disponible.
7. **Aucune prise de contact automatique dans le MVP** : pas de SMS/WhatsApp envoyé, pas d'envoi de masse ni de promesse de rappel automatique.

## Améliorations qui peuvent différencier YÉRÉ
- **Calendrier commercial de l'atelier** : Tabaski, Korité, mariages, baptêmes, rentrée scolaire, fêtes familiales et événements saisis par l'utilisateur.
- **Listes de clients pertinentes** : anciens clients de tenues de cérémonie, clients de boubous, clients à contacter avant une échéance, clients dont le numéro manque.
- **Relance liée à une commande** : commande prête, essayage à planifier, date de livraison qui approche, solde à régler. Ces alertes opérationnelles doivent rester distinctes du marketing.
- **Rappel au bon moment** : horizon de préparation réglable par type d'événement et délai de confection de l'atelier.
- **Historique de contact** : date, canal, message utilisé, résultat (réponse, demande de devis, commande créée, pas intéressé).
- **Mesure du revenu attribuable** : nombre de messages réellement envoyés par l'atelier, réponses, devis et commandes liés à la campagne, montant encaissé. Ne pas assimiler une suggestion à un revenu généré.
- **Réutilisation simple** : action pour copier un message individuel, puis plus tard préparer une liste d'envoi sans envoyer avant validation explicite.

## Règles de confiance et anti-spam
- Les suggestions doivent être explicables et permettre de les ignorer ou de les marquer comme traitées.
- Ne pas suggérer une relance si le client a demandé à ne plus être contacté, si les coordonnées sont invalides ou si une interaction récente rend la relance inadaptée.
- Prévoir une préférence de contact et un indicateur « ne pas contacter » avant la mise en production.
- Pas de relances marketing trop rapprochées : plafond configurable, période de calme et déduplication par client/campagne.
- Les messages doivent éviter la fausse familiarité, les promesses, la pression et toute information sensible.
- Les données clients et historiques restent isolés par atelier. Une campagne ne peut jamais exposer les clients d'un autre atelier.
- Les campagnes et événements sont gérés en heure locale de l'atelier ; conserver les dates d'événements et les fuseaux explicitement.
- Ne pas présenter une estimation de revenus comme une prévision garantie.

## Données à prévoir côté serveur
- client_contact_preferences: atelier, client, canal préféré, consentement/statut de contact, do_not_contact, date de mise à jour.
- campaigns: atelier, nom, occasion, date de l'événement, date de début et de fin de préparation, statut, auteur.
- reminder_suggestions: atelier, client, règle, commande source, date de création, date prévue, statut, dismissed_at/handled_at.
- contact_attempts: atelier, client, campagne facultative, canal, date, message/variante utilisée, résultat, auteur.
- attributed_orders: relation facultative entre une commande et une campagne/contact, avec règle d'attribution documentée.
- Indexer les recherches par atelier_id; appliquer authentification et règles d'accès en base de données.

Ces entités sont une proposition fonctionnelle. Elles ne sont pas encore des tables déployées.

## Critères d'acceptation
- Une commande sans date fiable ne déclenche pas de règle d'inactivité.
- Une commande future ne déclenche pas de relance.
- Le seuil de 180 jours est testé aux bornes (179, 180 et 181 jours).
- Une commande récente empêche la suggestion « client inactif » même si une ancienne commande de cérémonie existe ; le souvenir d'occasion peut rester séparé si pertinent.
- Une même règle ne produit pas plusieurs suggestions identiques pour le même client.
- Un atelier ne peut ni voir ni traiter les suggestions et contacts d'un autre atelier.
- « Ne pas contacter » bloque les propositions marketing et les actions d'envoi.
- Les fêtes à date variable doivent être confirmées ou modifiables par l'atelier.
- Le prototype n'affiche pas « envoyé » quand il a seulement copié un message.
- Les indicateurs de résultat reposent sur des contacts et commandes réellement enregistrés, pas sur le nombre de suggestions.

## Déploiement par étapes
- **Étape 1 — prototype** : suggestions explicables à partir des commandes datées, prévisualisation et copie manuelle des messages. Pas d'envoi automatique.
- **Étape 2 — serveur sécurisé** : commandes historisées, préférences de contact, statut traité/ignoré, isolation atelier.
- **Étape 3 — calendrier de campagnes** : événements, périodes de préparation, listes filtrées et historique des contacts.
- **Étape 4 — intégrations** : uniquement après validation juridique, consentement, coûts et fiabilité du fournisseur de messagerie. Commencer par une action manuelle explicite et un suivi de résultat.
- **Étape 5 — mesure commerciale** : conversions et revenus attribués avec des règles transparentes.

## Positionnement
**YÉRÉ Relances : les bons clients, la bonne occasion, au bon moment.** L'avantage n'est pas d'envoyer plus de messages ; c'est d'aider l'atelier à se souvenir des bonnes relations et à préparer son activité sans harceler ses clients.
