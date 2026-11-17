#!/usr/bin/env bash
# Instala o FreeLLMAPI (motor de IA) ao lado deste repositório, numa versão fixa.
# Uso: bash scripts/instalar-motor.sh   (pode rodar de novo sem problema)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
MOTOR="${FREELLMAPI_DIR:-$REPO/../freellmapi}"
VERSAO="${FREELLMAPI_VERSAO:-ca0a2741bad71fe6ca8b4f0e09ae6b918937d2fe}"

if [ ! -d "$MOTOR/.git" ]; then
  git init -q "$MOTOR"
  git -C "$MOTOR" remote add origin https://github.com/tashfeenahmed/freellmapi.git
fi
if [ "$(git -C "$MOTOR" rev-parse HEAD 2>/dev/null || true)" != "$VERSAO" ]; then
  git -C "$MOTOR" fetch -q --depth 1 origin "$VERSAO"
  git -C "$MOTOR" checkout -q --force FETCH_HEAD
fi
cd "$MOTOR"
[ -d node_modules ] || npm ci --no-audit --no-fund
[ -f client/dist/index.html ] || npm run build -w client
if [ ! -f .env ]; then
  K="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  printf "ENCRYPTION_KEY=%s\nPORT=3001\n" "$K" > .env
  chmod 600 .env
fi
echo "FreeLLMAPI instalado em $MOTOR"
