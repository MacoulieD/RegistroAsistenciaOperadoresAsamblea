#!/usr/bin/env bash
# =============================================================
#  deploy-asistencia.sh — Modelo A (HTTP healthcheck, sin proxy)
#  Despliega los últimos cambios de GitHub de
#  RegistroAsistenciaOperadoresAsamblea en el VPS usando Docker Compose.
#
#  Uso:
#    chmod +x deploy-asistencia.sh     (solo la primera vez)
#    ./deploy-asistencia.sh            Despliega si hay cambios nuevos en GitHub
#    ./deploy-asistencia.sh --force    Reconstruye aunque no haya cambios de git
#                                      (por ejemplo, tras editar el .env a mano)
# =============================================================

set -Eeuo pipefail

PROJECT_DIR="/opt/asistencia-operadores"
COMPOSE_FILE="docker-compose.yml"
BRANCH="main"
SERVICE="asistencia-operadores"
APP_PORT="30023"
HEALTH_TIMEOUT=60
LOGS_SINCE="5m"

FORCE=0
FAILED=0

# --- Helpers --------------------------------------------------
ts()   { date '+%Y-%m-%d %H:%M:%S'; }
log()  { echo "[$(ts)] $*"; }
warn() { echo "[$(ts)][WARN] $*" >&2; }
err()  { echo "[$(ts)][ERROR] $*" >&2; }

dc() { $DC -f "$COMPOSE_FILE" "$@"; }

trap 'err "Fallo en la línea $LINENO. Código $?";
      echo;
      echo "Comandos útiles:";
      echo "  $DC -f $COMPOSE_FILE logs --tail=120 $SERVICE";
      echo "  $DC -f $COMPOSE_FILE ps";
      exit 1' ERR

usage() {
  cat <<EOF
Uso: $0 [-f|--force] [-h|--help]
  -f, --force   Reconstruye aunque no haya cambios nuevos en git
                (útil tras editar .env o docker-compose.yml a mano)
  -h, --help    Esta ayuda
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force) FORCE=1; shift ;;
    -h|--help)  usage ;;
    *)          err "Opción desconocida: $1"; usage ;;
  esac
done

# --- 1. Comprobaciones previas ---------------------------------
info()  { echo -e "\n\033[1;34m==> $1\033[0m"; }
ok()    { echo -e "\033[1;32m✔ $1\033[0m"; }

info "Comprobando requisitos"

for cmd in git docker curl; do
  command -v "$cmd" >/dev/null 2>&1 || { err "Falta $cmd"; exit 1; }
done

detect_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    return 1
  fi
}
DC="$(detect_docker_compose || true)"
[[ -z "$DC" ]] && { err "No hay docker compose (ni el plugin ni el standalone docker-compose)."; exit 1; }
ok "Docker Compose detectado: $DC"

docker ps >/dev/null 2>&1 || { err "Tu usuario no puede usar Docker. Revisa que esté en el grupo 'docker' (groups \$USER) y vuelve a iniciar sesión."; exit 1; }

[ -d "$PROJECT_DIR" ] || { err "No existe la carpeta $PROJECT_DIR"; exit 1; }
cd "$PROJECT_DIR"
[ -d ".git" ] || { err "$PROJECT_DIR no es un repositorio git"; exit 1; }
[ -f "$COMPOSE_FILE" ] || { err "No existe $COMPOSE_FILE en $PROJECT_DIR"; exit 1; }
ok "Estás en $PROJECT_DIR"

# --- 2. Cambios locales sin commit ------------------------------
DIRTY=$(git status --porcelain | grep -vE '^.{0,2}[[:space:]]+deploy-asistencia\.sh$' || true)
if [[ -n "$DIRTY" ]]; then
  err "Hay cambios locales sin commit (distintos de deploy-asistencia.sh). Cancelando."
  git status --short
  exit 1
fi
ok "Working tree limpio"

# Si lo único "sucio" es este propio script (ej. el bit +x puesto a mano),
# se descarta ANTES del pull: "git pull --ff-only" rechaza pisar un archivo
# con cambios locales, aunque sean solo de modo.
git checkout -- deploy-asistencia.sh 2>/dev/null || true

# --- 3. Traer cambios de GitHub ---------------------------------
info "Descargando cambios de GitHub"
git fetch origin "$BRANCH"
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "origin/$BRANCH")

# "Ya está al día" solo cuenta si además el contenedor está corriendo.
SERVICE_RUNNING=0
dc ps --format json "$SERVICE" 2>/dev/null | grep -q '"State":"running"' && SERVICE_RUNNING=1

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]] && (( ! FORCE )) && (( SERVICE_RUNNING )); then
  warn "Ya está al día ($(git log -1 --pretty='%h - %s')) y $SERVICE está corriendo. Nada que hacer. Usa -f para forzar."
  dc ps
  exit 0
fi
(( SERVICE_RUNNING )) || warn "$SERVICE no está corriendo — se construye y levanta aunque no haya cambios nuevos de git."

if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  echo "Commits nuevos:"
  git --no-pager log --oneline "${LOCAL_SHA}..${REMOTE_SHA}" | sed 's/^/  • /'
fi

git pull --ff-only origin "$BRANCH"
ok "Código actualizado a: $(git log -1 --pretty='%h - %s (%cr)')"

# --- 4. Validar .env ---------------------------------------------
info "Validando .env"
[ -f ".env" ] || { err "Falta el archivo .env. Créalo con: cp .env.example .env && nano .env"; exit 1; }

REQUIRED_VARS=(DB_SERVER DB_PORT DB_NAME DB_USER DB_PASSWORD SESSION_SECRET RECAPTCHA_SECRET PORT)

MISSING=()
for v in "${REQUIRED_VARS[@]}"; do
  val=$(set -a; . ./.env 2>/dev/null || true; set +a; eval echo "\${$v:-}")
  [[ -z "$val" ]] && MISSING+=("$v")
done
if (( ${#MISSING[@]} > 0 )); then
  err "Faltan variables requeridas en .env: ${MISSING[*]}"
  exit 1
fi
ok "REQUIRED_VARS completas"

# La app escucha en PORT; si no coincide con el puerto publicado en
# docker-compose.yml, el contenedor arranca pero nadie le llega desde afuera.
ENV_PORT=$(set -a; . ./.env 2>/dev/null || true; set +a; echo "${PORT:-}")
if [[ "$ENV_PORT" != "$APP_PORT" ]]; then
  err "PORT=$ENV_PORT en .env, pero el contenedor publica el $APP_PORT. Pon PORT=$APP_PORT en .env."
  exit 1
fi
ok "PORT=$APP_PORT"

# --- 5. Validar sintaxis del compose ------------------------------
info "Validando $COMPOSE_FILE"
dc config --quiet
ok "$COMPOSE_FILE sintaxis válida"

# --- 6. Construir y levantar --------------------------------------
info "Construyendo $SERVICE"
dc build "$SERVICE"

info "Levantando $SERVICE"
dc up -d --remove-orphans "$SERVICE"
ok "$SERVICE levantado"

# --- 7. Esperar healthcheck HTTP ----------------------------------
# /api/health/db responde 200 solo si además hay conexión a SQL Server
# (503 si no), así que valida la app y la BD de una vez.
info "Esperando a que $SERVICE responda (timeout ${HEALTH_TIMEOUT}s)"
wait_for_http() {
  local url="$1" name="$2" end=$(( $(date +%s) + HEALTH_TIMEOUT ))
  while (( $(date +%s) < end )); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null) || true
    code=${code:-000}
    case "$code" in
      000|502|503|504) : ;;
      *) log "${name}: HTTP ${code} OK"; return 0 ;;
    esac
    sleep 2
  done
  warn "Timeout esperando a ${name} (¿sin conexión a la BD? revisa los logs)."
  FAILED=1
}
wait_for_http "http://localhost:${APP_PORT}/api/health/db" "$SERVICE"

# --- 8. Revisar logs recientes -------------------------------------
info "Revisando logs de los últimos $LOGS_SINCE"
SERVICE_LOGS=$(dc logs "$SERVICE" --since "$LOGS_SINCE" 2>/dev/null || true)

if [[ -z "$SERVICE_LOGS" ]]; then
  log "$SERVICE: sin logs nuevos (no reinició, probablemente por cache de capas). OK"
else
  if echo "$SERVICE_LOGS" | grep -qiE "ERROR|Fallo|No se pudo conectar|Login failed for user"; then
    err "Errores detectados en los logs de $SERVICE:"
    echo "$SERVICE_LOGS" | grep -iE "ERROR|Fallo|No se pudo conectar|Login failed" | head -10 | sed 's/^/    /'
    FAILED=1
  else
    log "Logs de $SERVICE limpios"
  fi

  if echo "$SERVICE_LOGS" | grep -q "Servidor en ejecución"; then
    log "Arranque confirmado: \"Servidor en ejecución\" presente en logs"
  else
    warn "No se encontró el mensaje de arranque esperado en los logs — revisar manualmente."
  fi
fi

# --- 9. Estado final del servicio -----------------------------------
info "Estado de $SERVICE"
STATUS_JSON=$(dc ps --format json "$SERVICE" 2>/dev/null || true)
if echo "$STATUS_JSON" | grep -q '"Health":"healthy"'; then
  ok "$SERVICE: healthy"
elif echo "$STATUS_JSON" | grep -q '"State":"running"'; then
  ok "$SERVICE: running"
else
  err "$SERVICE: no está corriendo correctamente"
  FAILED=1
fi

# --- 10. Limpieza de imágenes dangling (solo si todo salió bien) ----
if (( FAILED == 0 )); then
  info "Limpiando imágenes sin uso"
  BEFORE=$(docker images -f "dangling=true" -q | wc -l | tr -d ' ')
  docker image prune -f --filter "dangling=true" >/dev/null
  AFTER=$(docker images -f "dangling=true" -q | wc -l | tr -d ' ')
  REMOVED=$(( BEFORE - AFTER ))
  (( REMOVED > 0 )) && ok "Prune: ${REMOVED} imágenes liberadas" || ok "Prune: nada que limpiar"
else
  warn "Hubo fallos — omitiendo prune a propósito (hace falta la imagen anterior por si hay que hacer rollback sin rebuildear)."
  warn "Más tarde, si todo queda bien: docker image prune -f --filter dangling=true"
fi

# --- 11. Resumen final -------------------------------------------------
dc ps

if (( FAILED == 0 )); then
  echo -e "\n\033[1;32m=== DESPLIEGUE OK ===\033[0m"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo "Proyecto: $PROJECT_DIR | Rama: $BRANCH | Compose: $COMPOSE_FILE"
  echo "Asistencia operadores: http://localhost:${APP_PORT}/"
  exit 0
else
  err "=== DESPLIEGUE CON FALLOS ==="
  echo "Comandos útiles:"
  echo "  $DC -f $COMPOSE_FILE logs --tail=120 $SERVICE"
  echo "  $DC -f $COMPOSE_FILE ps"
  exit 1
fi
