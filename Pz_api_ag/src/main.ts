import { createServer } from 'node:http';
import { buildGateway } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';
import { attachWebSocket } from './server.js';

function fail(message: string): never {
  console.error(`[gateway] configuración inválida: ${message}`);
  process.exit(1);
}

function readConfig(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) fail(error.message);
    throw error;
  }
}

const config = readConfig();

const { yoga, priceEvents } = buildGateway(config);

const httpServer = createServer(yoga);
attachWebSocket(httpServer, yoga);

httpServer.listen(config.port, () => {
  const clients = config.useMocks
    ? 'clientes falsos (USE_MOCKS=true)'
    : `MS usuarios ${config.msUsuariosUrl}, subastas ${config.msSubastasUrl}, billetera ${config.msBilleteraUrl}, ` +
      `catálogo ${config.msCatalogoUrl}, postpuja ${config.msPostpujaUrl}, notificaciones ${config.msNotificacionesUrl} ` +
      'y el broker de eventos (RABBITMQ_URL)';
  console.info(`[gateway] escuchando en http://localhost:${config.port}${yoga.graphqlEndpoint} con ${clients}`);
});

// Al apagar (docker compose stop) se cierra la conexión al broker; su cola exclusiva se borra sola.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void priceEvents.stop().finally(() => process.exit(0));
  });
}
