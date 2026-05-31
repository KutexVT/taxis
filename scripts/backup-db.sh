#!/usr/bin/env bash
# Respaldo de la base de datos PostgreSQL del contenedor de produccion.
# Uso: ./scripts/backup-db.sh [directorio_destino]
# Programar con cron, p.ej. diario a las 3am:
#   0 3 * * * /ruta/taxi-platform/scripts/backup-db.sh /var/backups/taxi
set -euo pipefail

DEST="${1:-./backups}"
CONTAINER="${PG_CONTAINER:-taxi_postgres}"
DB="${POSTGRES_DB:-taxi_platform}"
USER="${POSTGRES_USER:-taxi}"

mkdir -p "$DEST"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$DEST/taxi_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" | gzip > "$OUT"
echo "Respaldo creado: $OUT"

# Conserva solo los ultimos 14 respaldos.
ls -1t "$DEST"/taxi_*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
