# YÉRÉ — Recette manuelle du mode hors ligne (iPhone et navigateur)

## Statut

Cette recette n'a pas encore été exécutée sur un appareil réel. Les tests automatisés utilisent `fake-indexeddb` : ils valident les opérations IndexedDB du module, mais ne prouvent pas le comportement de Safari iOS, du stockage privé, ni la persistance après fermeture réelle du navigateur.

Le coffre chiffré reste une fondation non reliée aux chargements métier. Ne pas annoncer un mode hors ligne complet et ne pas activer la lecture métier depuis ce coffre avant une intégration et une recette dédiées.

## Préparation sans données personnelles

- Utiliser deux comptes de test et deux ateliers de test, sans fiche client réelle.
- Synchroniser les deux comptes en ligne et vérifier que chaque compte ne voit que ses ateliers.
- Ne pas utiliser de caisse, de paiement, de dépense ou de donnée financière dans cette recette.

## Scénarios à exécuter sur Safari iPhone

1. **Stockage disponible** — Ouvrir YÉRÉ en navigation normale, se connecter et confirmer que les dossiers sont chargés depuis Supabase.
2. **Coupure réseau** — Activer le mode avion sans fermer l'onglet. Vérifier que les données déjà présentes à l'écran restent consultables, qu'aucune écriture n'est annoncée comme enregistrée et qu'une tentative de modification est bloquée.
3. **Rechargement hors ligne** — En restant hors ligne, recharger la page. Vérifier qu'aucun dossier métier n'apparaît et qu'un message demande de retrouver Internet.
4. **Retour réseau** — Désactiver le mode avion et relancer la vérification. Vérifier que les dossiers sont rechargés depuis Supabase.
5. **Fermeture et réouverture** — Fermer complètement Safari puis rouvrir YÉRÉ hors ligne. Vérifier qu'aucune donnée métier n'est présentée avant confirmation serveur.
6. **Changement d'atelier** — En ligne, passer du premier atelier au second. Vérifier qu'aucune donnée du premier atelier ne reste visible pendant ou après le chargement.
7. **Changement de compte** — Se déconnecter du compte A, se connecter au compte B et vérifier l'absence de données du compte A.
8. **Navigation privée / stockage indisponible** — Vérifier que YÉRÉ affiche une limitation claire et ne prétend pas avoir conservé de cache si IndexedDB est indisponible.

## Critères de réussite

- Aucun dossier métier avant confirmation de l'appartenance active par le serveur.
- Aucune donnée financière exposée aux rôles gestionnaire ou employé.
- Aucune écriture mise en attente ou annoncée comme enregistrée hors ligne.
- Aucune donnée d'un autre compte ou atelier visible.
- Aucune archive historique localStorage supprimée ou réimportée.
- Les échecs de stockage ou de vérification serveur ferment l'accès aux données métier.

## Preuve à consigner

Pour chaque scénario : appareil et version iOS, navigateur et version, date/heure, résultat attendu, résultat observé et capture d'écran sans donnée personnelle. Tout échec bloque la mise en service du mode hors ligne.
