#!/usr/bin/env bash
# Liga o motor (FreeLLMAPI local, se instalado) e o Estúdio AgenciaIa.
# Se FREELLMAPI_URL e FREELLMAPI_KEY já estiverem no .env (ex.: app do FreeLLMAPI no seu PC),
# só o Estúdio é iniciado.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
MOTOR="${FREELLMAPI_DIR:-$REPO/../freellmapi}"
cd "$REPO"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

if [ -z "${FREELLMAPI_KEY:-}" ]; then
  if [ ! -d "$MOTOR/node_modules" ]; then
    echo "Motor não instalado. Rode: npm run instalar-motor"; exit 1
  fi
  if ! curl -s -o /dev/null http://localhost:3001/; then
    echo "Ligando o FreeLLMAPI na porta 3001…"
    (cd "$MOTOR/server" && FREEAPI_CONFIG_PATH="$REPO/motor/freellmapi.config.json" \
      nohup npx tsx src/index.ts > "$MOTOR/motor.log" 2>&1 &)
    for _ in $(seq 1 45); do curl -s -o /dev/null http://localhost:3001/ && break; sleep 2; done
  fi
  FREELLMAPI_KEY="$(cd "$MOTOR/server" && node -e "const D=require('better-sqlite3');console.log(new D('data/freeapi.db',{readonly:true}).prepare(\"SELECT value FROM settings WHERE key='unified_api_key'\").get().value)")"
  export FREELLMAPI_KEY
  export FREELLMAPI_URL="http://127.0.0.1:3001/v1"  # motor local iniciado por este script
fi

exec node server.mjs
