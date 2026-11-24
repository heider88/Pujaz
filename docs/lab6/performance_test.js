// Laboratorio 6: prueba de carga del listado del catálogo (GET /).
// Uso: k6 run -e BASE_URL=https://<servidor> -e VUS=50 performance_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const VUS = Number(__ENV.VUS || 1);

// La página carga el catálogo por streaming: si el gateway falla, el servidor
// igual responde 200 pero con un mensaje de error en el HTML. Por eso una
// respuesta solo cuenta como buena si trae un lote de la semilla del catálogo.
const LOTE_ESPERADO = 'Reloj Vintage';
const errores = new Rate('errores');

export const options = {
  vus: VUS,
  duration: '30s',
};

export default function () {
  const res = http.get(`${BASE_URL}/`);

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'catalogo cargado': (r) => typeof r.body === 'string' && r.body.includes(LOTE_ESPERADO),
  });
  errores.add(!ok);

  sleep(1);
}
