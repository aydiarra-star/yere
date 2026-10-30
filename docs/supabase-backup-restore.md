# Sauvegardes Supabase YÉRÉ (solution gratuite)

## Périmètre

Le workflow `.github/workflows/supabase-backup.yml` lance une sauvegarde chaque jour à 02:30 UTC et peut aussi être déclenché manuellement depuis GitHub Actions.

Il exporte, avec la Supabase CLI :
- les rôles PostgreSQL personnalisés ;
- le schéma des schémas utilisateur gérés par la CLI ;
- les données ;
- le schéma et les données de l'historique `supabase_migrations`.

L'archive est chiffrée avec age **avant** son dépôt dans les artefacts GitHub. Seuls le fichier chiffré et son empreinte SHA-256 sont téléversés. Les artefacts sont conservés quatorze jours.

## Limites importantes

La commande `supabase db dump` exclut les schémas gérés par Supabase, notamment `auth` et `storage`, ainsi que certains schémas d'extensions. Cette sauvegarde ne restaure donc pas à elle seule les comptes Auth, les paramètres internes Supabase ni les fichiers Storage. Les fichiers Storage doivent faire l'objet d'une sauvegarde séparée avant une mise en production qui les utilise.

Le dépôt YÉRÉ étant public, **ne jamais téléverser une archive SQL non chiffrée** dans ses artefacts, issues, commits ou logs. Le workflow exige une clé publique age et échoue si elle manque. La clé privée age doit rester hors de GitHub.

La sauvegarde quotidienne n'est pas du PITR : les changements intervenus après le dernier export peuvent être perdus. La limite de conservation des artefacts est de quatorze jours et dépend du quota GitHub disponible.

## Configuration unique requise

### 1. Créer une paire de clés age sur un appareil de confiance

Installer age, puis exécuter :

```bash
age-keygen -o yere-backup-key.txt
age-keygen -y yere-backup-key.txt
```

La deuxième commande affiche le destinataire public commençant par `age1...`.

- Conserver `yere-backup-key.txt` en lieu sûr, hors du dépôt et hors de GitHub.
- Ne jamais transmettre ni publier la clé privée.
- Faire une copie de secours chiffrée de cette clé privée : sans elle, les archives ne pourront pas être déchiffrées.

### 2. Ajouter les paramètres dans GitHub

Dans le dépôt, ouvrir **Settings → Secrets and variables → Actions**.

Créer :
- dans **Secrets**, `SUPABASE_DB_URL` : l'URL PostgreSQL de connexion Supabase, idéalement celle du Session pooler, mot de passe inclus et correctement encodé ;
- dans **Variables**, `BACKUP_AGE_RECIPIENT` : le destinataire public `age1...` obtenu à l'étape précédente.

Ne jamais mettre le mot de passe PostgreSQL dans une variable publique, un fichier ou le code.

### 3. Activer le planning

Le planning GitHub Actions ne s'exécutera qu'après intégration du workflow dans la branche par défaut `main`. Une fois cette PR fusionnée et les deux paramètres configurés, ouvrir **Actions → Sauvegarde Supabase YÉRÉ → Run workflow** pour effectuer le premier test manuel.

## Déchiffrer une archive

Après téléchargement de l'artefact depuis l'exécution GitHub Actions :

```bash
sha256sum -c yere-db-backup.tar.gz.age.sha256
age --decrypt -i yere-backup-key.txt -o yere-db-backup.tar.gz yere-db-backup.tar.gz.age
mkdir yere-db-backup
tar -xzf yere-db-backup.tar.gz -C yere-db-backup
```

## Restauration

Ne jamais lancer une restauration sur la base de production existante sans procédure de reprise validée et sauvegarde préalable. La procédure de restauration logique Supabase est conçue pour une nouvelle base cible préparée à cet effet. Elle doit être testée sur un projet de récupération, avec vérification des extensions, rôles et privilèges.

Exemple de restauration du schéma et des données dans une **nouvelle base cible** (adapter et vérifier l'URL de destination) :

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file yere-db-backup/roles.sql \
  --file yere-db-backup/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file yere-db-backup/data.sql \
  --dbname "$NEW_DB_URL"
```

L'historique `supabase_migrations` se restaure séparément si nécessaire, après vérification de la cible et de l'état de ses migrations. Les comptes Auth et les fichiers Storage demandent une procédure distincte.

## Vérification opérationnelle

Une sauvegarde n'est considérée comme fiable qu'après :
1. une exécution GitHub Actions réussie ;
2. la présence de l'archive chiffrée et de son empreinte ;
3. un test de déchiffrement avec la clé privée conservée ;
4. un test de restauration sur un projet Supabase distinct, sans toucher à la production.
