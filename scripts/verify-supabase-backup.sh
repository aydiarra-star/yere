#!/usr/bin/env bash
# Verify and decrypt a YÉRÉ Supabase backup without connecting to any database.
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/verify-supabase-backup.sh ARCHIVE.age AGE_IDENTITY [--extract-to DIRECTORY]

Checks the SHA-256 sidecar, decrypts the archive in a private temporary
directory, validates the gzip/tar structure and required SQL dumps, and
optionally extracts the verified files into a new directory.

This script NEVER connects to PostgreSQL and NEVER restores production.
USAGE
}

fail() {
  printf 'ERREUR: %s\n' "$*" >&2
  exit 1
}

[[ $# -ge 2 ]] || { usage; exit 2; }
archive=$1
identity=$2
shift 2

extract_to=""
if [[ $# -gt 0 ]]; then
  [[ $# -eq 2 && "$1" == "--extract-to" ]] || { usage; exit 2; }
  extract_to=$2
fi

[[ -f "$archive" ]] || fail "Archive introuvable."
[[ -s "$archive" ]] || fail "Archive vide."
[[ -f "$identity" && -s "$identity" ]] || fail "Fichier d'identité age introuvable ou vide."
command -v age >/dev/null 2>&1 || fail "La commande age est requise."
command -v sha256sum >/dev/null 2>&1 || fail "La commande sha256sum est requise."
command -v tar >/dev/null 2>&1 || fail "La commande tar est requise."

archive_dir=$(cd -- "$(dirname -- "$archive")" && pwd)
archive_name=$(basename -- "$archive")
checksum="$archive.sha256"
[[ -f "$checksum" && -s "$checksum" ]] || fail "Fichier SHA-256 adjacent manquant: $checksum"

(
  cd "$archive_dir"
  sha256sum --check --status "$(basename -- "$checksum")"
) || fail "L'empreinte SHA-256 ne correspond pas à l'archive."

tmp=$(mktemp -d)
chmod 700 "$tmp"
cleanup() { rm -rf -- "$tmp"; }
trap cleanup EXIT

age --decrypt --identity "$identity" --output "$tmp/backup.tar.gz" "$archive" \
  || fail "Déchiffrement impossible : vérifiez la clé privée age."
gzip -t "$tmp/backup.tar.gz" || fail "Archive gzip corrompue."
tar -tzf "$tmp/backup.tar.gz" > "$tmp/entries.txt" || fail "Archive tar illisible."

for required in roles.sql schema.sql data.sql migration-history-schema.sql migration-history-data.sql README.txt; do
  grep -Fxq "./$required" "$tmp/entries.txt" || grep -Fxq "$required" "$tmp/entries.txt" \
    || fail "Fichier requis absent de l'archive: $required"
done

mkdir "$tmp/unpacked"
tar -xzf "$tmp/backup.tar.gz" -C "$tmp/unpacked" --no-same-owner --no-same-permissions
for required in roles.sql schema.sql data.sql migration-history-schema.sql migration-history-data.sql README.txt; do
  [[ -s "$tmp/unpacked/$required" ]] || fail "Fichier requis vide ou absent: $required"
done

if [[ -n "$extract_to" ]]; then
  [[ ! -e "$extract_to" ]] || fail "Le dossier de destination existe déjà; aucun fichier n'a été écrasé."
  mkdir -p -- "$(dirname -- "$extract_to")"
  cp -a -- "$tmp/unpacked" "$extract_to"
  printf 'Archive vérifiée et déchiffrée. Fichiers extraits dans: %s\n' "$extract_to"
else
  printf 'Archive vérifiée : empreinte valide, déchiffrement réussi, gzip/tar lisibles, six fichiers requis présents.\n'
  printf 'Aucune connexion à une base de données et aucune restauration effectuées.\n'
fi
