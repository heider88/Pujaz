#!/usr/bin/env bash
# Laboratorio 6: corre la prueba de carga nivel por nivel y guarda cada resultado.
# Uso: ./correr_niveles.sh https://<servidor> [niveles...]
#   ./correr_niveles.sh https://xxxx-8080.app.github.dev
#   ./correr_niveles.sh https://xxxx-8080.app.github.dev 300 400   # solo esos niveles
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <BASE_URL> [niveles...]" >&2
  exit 1
fi

BASE_URL="$1"
shift
if [ $# -gt 0 ]; then
  NIVELES=("$@")
else
  NIVELES=(1 50 100 200 500 1000 2000)
fi
ULTIMO="${NIVELES[$((${#NIVELES[@]} - 1))]}"

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p resultados
ulimit -n 10000 2>/dev/null || echo "Aviso: no se pudo subir el límite de conexiones (ulimit -n)." >&2

for VUS in "${NIVELES[@]}"; do
  echo "=== Nivel: $VUS usuarios ==="
  # Si un nivel no pasa los checks, k6 igual termina; se sigue con el siguiente.
  k6 run -e BASE_URL="$BASE_URL" -e VUS="$VUS" \
    --summary-export="resultados/vus-$VUS.json" \
    "$DIR/performance_test.js" | tee "resultados/vus-$VUS.txt" || true

  if [ "$VUS" != "$ULTIMO" ]; then
    echo "Pausa de 60 s para que el servidor se recupere..."
    sleep 60
  fi
done

echo "Listo. Resultados en $(pwd)/resultados"
