# Plan de mise en œuvre — mode hors ligne

## État actuel de la branche

La branche `feat/atelier-first-slice` contient :
- `public/sw.js`, service worker qui met en cache la coque de l'application, la page d'accueil, le manifeste et les ressources de même origine rencontrées pendant la navigation ;
- `public/manifest.webmanifest`, manifeste d'installation ;
- un enregistrement du service worker dans `src/main.tsx`, activé uniquement en production ;
- un indicateur de connexion en ligne/hors ligne dans l'en-tête ;
- une conservation locale des clients et commandes via `localStorage`.

## Limites et précautions

- Le mode hors ligne doit être servi via HTTPS (Render le fournit) et le site doit être ouvert au moins une fois en ligne afin de mettre en cache les ressources nécessaires.
- Le stockage reste propre à ce navigateur et à cet appareil. Il n'y a ni compte, ni synchronisation multi-appareil, ni sauvegarde distante.
- Une suppression des données du navigateur peut effacer les fiches locales.
- Ne pas utiliser de vraies données clients dans ce prototype.
- Le cache du navigateur n'est pas une sauvegarde fiable et ne remplace pas la persistance serveur.

## Vérification manuelle avant de présenter le mode hors ligne

1. Attendre que le déploiement du commit courant soit terminé.
2. Ouvrir le site en ligne, attendre le chargement complet, puis recharger une fois la page.
3. Créer une fiche de test et modifier une mesure ; vérifier que les changements restent après rechargement.
4. Activer le mode avion ou couper le réseau.
5. Recharger l'application et vérifier que l'interface revient, que les données de test sont toujours présentes et que l'indicateur affiche « Hors ligne ».
6. Rétablir le réseau et vérifier que l'indicateur revient à « En ligne ».

## Critères de sortie

Le mode hors ligne du prototype ne doit être considéré comme validé qu'après :
- réussite de `npm test` et `npm run build` sur le commit courant ;
- déploiement Render du commit courant ;
- test réel hors connexion sur mobile et ordinateur ;
- vérification que les opérations locales n'affichent pas de promesse de synchronisation serveur.

La prochaine étape produit, distincte du mode hors ligne local, sera une authentification et une persistance serveur sécurisées avec isolation stricte des ateliers.
