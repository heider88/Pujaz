// Revisión de salud para Docker: responde sin consultar al gateway, así el contenedor del front
// no se marca como caído por culpa de otro componente.
export function GET() {
  return new Response('ok', { headers: { 'Content-Type': 'text/plain' } })
}
