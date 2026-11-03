#!/usr/bin/env bash
# Descarga las fotos de las piezas de ejemplo (Pz_catalogo_db/init.js) desde Wikimedia Commons
# a public/lotes/. Todas son de uso libre; autores y licencias en public/lotes/CREDITOS.md.
# Uso, desde Pz_web_fe:  bash scripts/descargar-fotos.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/lotes

descargar() {
  local archivo="$1" commons="$2"
  echo "Descargando ${archivo}"
  curl -fsSL -A "Pujaz/1.0 (proyecto universitario UNAL)" \
    "https://commons.wikimedia.org/wiki/Special:FilePath/${commons}?width=1000" \
    -o "public/lotes/${archivo}"
}

descargar reloj-vintage.jpg      "Vintage_Elgin_Open_Face_Pocket_Watch,_15_Jewels,_Size_18s,_Grade_317,_Pendant_Set,_Circa_1918_(17687946084).jpg"
descargar pintura-abstracta.jpg  "Suprematism_-_Abstract_Composition_(Malevich,_1915).jpg"
descargar moneda-romana.jpg      "Silver_Roman_Denarius_(FindID_391698).jpg"
descargar ford-mustang-1969.jpg  "1969_Ford_Mustang.jpg"
descargar collar-perlas.jpg      "White_pearl_necklace.jpg"
descargar camara-leica.jpg       "Leica-IIIb-front.jpg"
descargar escultura-bronce.jpg   "Bronze-Sculpture_of_cranes,_Croatia.jpg"
descargar anillo-diamante.jpg    "Solitary_ring_and_diamond.JPG"
descargar don-quijote.jpg        "Title_page_first_edition_Don_Quijote.jpg"
descargar porsche-911.jpg        "1970_Porsche_911.jpg"

echo "Listo: $(ls public/lotes/*.jpg | wc -l) fotos en public/lotes/"
