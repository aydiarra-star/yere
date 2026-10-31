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
- dans **Secrets**, `SUPABASE_DB_URL` : l'URL PostgreSQL de connexion Supabase, mot de passe inclus et correctement encodé ;
- dans **Variables**, `BACKUP_AGE_RECIPIENT` : le destinataire public `age1...` obtenu à l'étape précédente.

**Réseau IPv4 de GitHub Actions :** le workflow détecte l'URL directe YÉRÉ (`db.<project-ref>.supabase.co:5432`) et la convertit automatiquement vers le **Shared Pooler en mode Session** (hôte `aws-1-eu-west-3.pooler.supabase.com`, port `5432`, utilisateur `postgres.<project-ref>`). Cela évite l'échec IPv6 des runners GitHub sans exiger de remplacer le secret déjà configuré. Si le secret contient déjà l'URL du Session pooler, il est utilisé tel quel. Ne pas utiliser le Transaction pooler (port `6543`) pour `pg_dump`.

Ne jamais mettre le mot de passe PostgreSQL dans une variable publique, un fichier ou le code.

### 3. Activer le planning

Le planning GitHub Actions ne s'exécutera qu'après intégration du workflow dans la branche par défaut `main`. Une fois cette PR fusionnée et les deux paramètres configurés, ouvrir **Actions → Sauvegarde Supabase YÉRÉ → Run workflow** pour effectuer le premier test manuel.

## Vérifier et déchiffrer une archive

Après téléchargement de l'artefact depuis l'exécution GitHub Actions, placer l'archive, son fichier `.sha256` et la clé privée age dans un dossier local protégé. Depuis la racine du dépôt :

```bash
chmod 700 scripts/verify-supabase-backup.sh
scripts/verify-supabase-backup.sh \
  /chemin/yere-db-backup.tar.gz.age \
  /chemin/yere-backup-key.txt
```

Le script vérifie l'empreinte SHA-256, déchiffre dans un dossier temporaire privé et contrôle l'intégrité gzip/tar ainsi que la présence des exports SQL attendus. Il ne se connecte à aucune base et ne lance aucune restauration.

Pour extraire les fichiers vérifiés dans un nouveau dossier (qui ne doit pas déjà exister) :

```bash
scripts/verify-supabase-backup.sh \
  /chemin/yere-db-backup.tar.gz.age \
  /chemin/yere-backup-key.txt \
  --extract-to ./yere-db-backup-verified
```

## Restauration

**Aucune restauration réelle n'est encore certifiée.** Ne jamais lancer une restauration sur la base de production existante. Le test doit se faire sur un projet Supabase de récupération distinct, avec une sauvegarde préalable de cette cible, puis vérification des extensions, rôles, privilèges, contraintes, données et fonctions métier.

La restauration des rôles et du schéma peut nécessiter une adaptation au projet cible : les rôles intégrés Supabase et les extensions ne doivent pas être écrasés aveuglément. L'historique `supabase_migrations` se restaure séparément, après comparaison avec les migrations déjà présentes. Les comptes Auth et les fichiers Storage demandent une procédure distincte.

Le script de pré-vérification fourni ne restaure volontairement rien. Il ne faut pas confondre un fichier déchiffrable avec une restauration complète et exploitable.

## Vérification opérationnelle

Une sauvegarde n'est considérée comme fiable qu'après :
1. une exécution GitHub Actions réussie ;
2. la présence de l'archive chiffrée et de son empreinte ;
3. un test de déchiffrement avec la clé privée conservée ;
4. un test de restauration sur un projet Supabase distinct ;
5. une vérification fonctionnelle des données restaurées, sans toucher à la production.
