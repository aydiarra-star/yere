# Modèle de données fonctionnel — MVP YÉRÉ Atelier

**Statut :** proposition indépendante du moteur choisi; à adapter après décision technique.  
**Devise initiale proposée :** XOF (franc CFA BCEAO), à confirmer avec le pilote.

## Principes
- Chaque donnée métier appartient à un atelier identifié par `atelier_id`.
- Aucun enregistrement métier privé ne doit exister sans propriétaire atelier.
- Les identifiants sont opaques et ne doivent pas servir seuls de contrôle d'accès.
- Les dates d'événements sont conservées; l'interface affiche les dates selon le fuseau pertinent.
- Les montants sont stockés en unités entières de la devise (pas de nombres flottants).
- Les paiements et corrections financières sont traçables; une opération enregistrée n'est pas effacée silencieusement.
- Les mesures conservent un historique daté au lieu d'écraser l'ancienne version.

## Entités proposées

### Atelier
- `id`
- `nom`
- `telephone_contact` (facultatif)
- `ville` (facultatif)
- `devise` (XOF par défaut au lancement, configurable seulement si le produit l'exige)
- `created_at`, `updated_at`

### Utilisateur et appartenance
- `users` : identité gérée par le fournisseur d'authentification, pas de mot de passe maison.
- `atelier_memberships` : `atelier_id`, `user_id`, `role`, `created_at`.
- Rôles initiaux possibles : propriétaire et employé. Si le MVP ne gère qu'un propriétaire, conserver un modèle extensible sans complexifier l'interface.
- L'appartenance doit être vérifiée côté serveur/base de données pour chaque action.

### Client
- `id`, `atelier_id`, `nom`, `telephone` facultatif, `notes` limitées au nécessaire, `created_at`, `updated_at`, `archived_at` facultatif.
- Index de recherche par atelier et nom/téléphone.
- Ne pas imposer que le téléphone soit unique : une famille peut partager un numéro et certains clients n'en ont pas.

### Profil de mensurations
- `id`, `atelier_id`, `client_id`, `type_vetement`, `label` facultatif, `taken_at`, `notes` facultatives, `created_by`, `created_at`.
- Les versions anciennes sont conservées. Une correction doit être visible et traçable.
- Les valeurs peuvent être normalisées dans une table enfant `measurement_values` : `measurement_profile_id`, `measurement_key`, `value`, `unit`.
- Définir les clés de mesures et unités autorisées après observation des pratiques des tailleurs. Ne pas mélanger cm et pouces sans indication explicite.

### Commande
- `id`, `atelier_id`, `client_id`, `reference` lisible par atelier, `garment_type`, `quantity`, `agreed_amount`, `currency`, `ordered_at`, `due_at` facultatif, `status`, `notes` facultatives, `created_by`, `created_at`, `updated_at`, `delivered_at` facultatif, `cancelled_at` facultatif.
- La référence lisible est unique dans un atelier, pas nécessairement à l'échelle globale.
- Les statuts initiaux peuvent inclure : reçue, coupe, couture, finition, essayage, prête, livrée, annulée. Le changement de statut est historisé.
- Si une commande contient plusieurs vêtements avec prix différents, prévoir ultérieurement `order_items`; ne pas bloquer le MVP si une commande = un article homogène.

### Événement de statut de commande
- `id`, `atelier_id`, `order_id`, `from_status`, `to_status`, `changed_by`, `occurred_at`, `note` facultative.
- L'événement doit appartenir au même atelier que la commande.

### Paiement
- `id`, `atelier_id`, `order_id`, `amount` entier positif, `currency`, `method` (espèces, transfert, autre), `paid_at`, `recorded_by`, `note` facultative, `reversal_of_payment_id` facultatif pour correction/remboursement, `created_at`.
- Solde calculé à partir du prix convenu et des paiements nets; ne pas maintenir plusieurs soldes indépendants qui peuvent diverger.
- Refuser ou signaler les paiements excédentaires selon une règle métier explicitement définie; ne pas les masquer.
- Les remboursements/corrections sont des événements liés, pas une suppression de la transaction d'origine.

### Dépense (lot ultérieur si la caisse est dans le premier pilote)
- `id`, `atelier_id`, `category`, `amount` entier positif, `currency`, `occurred_at`, `description`, `supplier_id` facultatif, `recorded_by`, `created_at`, `reversal_of_expense_id` facultatif.
- Ne pas présenter le bénéfice comme exact si les dépenses ne sont pas toutes saisies.

### Article de stock (lot ultérieur)
- `id`, `atelier_id`, `name`, `category`, `unit`, `reorder_threshold` facultatif, `created_at`, `updated_at`.
- Les unités peuvent varier : pièce, bobine, mètre, lot, etc.

### Mouvement de stock (lot ultérieur)
- `id`, `atelier_id`, `stock_item_id`, `movement_type` (entrée, sortie, perte, correction), `quantity`, `occurred_at`, `reason`, `recorded_by`.
- Le stock courant est dérivé des mouvements ou maintenu avec une stratégie de cohérence explicitement testée.

## Contraintes et validations
- `quantity > 0`; prix, paiement et dépense doivent être des entiers valides dans la devise retenue.
- Une échéance, si fournie, doit être une date valide.
- Un client, profil de mensurations, commande, paiement et événement doivent appartenir au même atelier.
- Les statuts de commande ne peuvent prendre que les valeurs autorisées.
- Un paiement ne peut pas être associé à une commande d'un autre atelier.
- Les suppressions en cascade ne doivent pas effacer l'historique financier.
- Les données archivées doivent rester exclues des vues ordinaires sans être détruites sans nécessité.

## Sécurité multi-atelier
Pour chaque table métier :
1. Activer les protections au niveau base de données lorsque le moteur les fournit.
2. Vérifier l'appartenance active de l'utilisateur à l'atelier.
3. Appliquer des règles de lecture, insertion, modification et suppression distinctes.
4. Lors d'une modification, vérifier l'accès à la ligne existante et empêcher le transfert vers un autre atelier.
5. Tester explicitement les tentatives d'accès croisé entre deux ateliers.

Si Supabase est retenu, activer RLS sur chaque table exposée. Les politiques UPDATE doivent inclure les conditions d'accès à la ligne existante et les conditions de validation de la nouvelle ligne; ne jamais se limiter à vérifier qu'un utilisateur est connecté.

## Décisions encore ouvertes
- Un compte propriétaire seul ou plusieurs membres dès le MVP.
- Format exact des mensurations et liste de mesures par type de vêtement.
- Gestion d'une commande contenant plusieurs articles.
- Politique de remboursement et de paiement excédentaire.
- Durée de conservation, export et suppression des données.
- Entités à inclure dans la première migration selon la stack choisie.
