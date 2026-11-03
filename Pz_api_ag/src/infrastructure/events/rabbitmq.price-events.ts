import { connect, type ChannelModel, type RecoveringChannelModel } from 'amqplib';
import type { PriceEvents } from '../../modules/auctions/index.js';

// eventos.md §0: un solo exchange fanout; la routing key dice qué evento es.
const EXCHANGE = 'eventos';
const PRICE_UPDATED = 'PrecioActualizado';
const MAX_RECONNECT_DELAY_MS = 5000;

// Saca el id de la subasta de un mensaje del exchange, o null si no es PrecioActualizado o no se puede
// leer. Acepta auctionId como texto (contrato) o como número (lo que publica hoy Pz_subastas_cl); lo
// demás del mensaje no se usa porque el Gateway vuelve a leer la subasta.
export function readPriceUpdated(routingKey: string, content: Buffer): string | null {
  if (routingKey !== PRICE_UPDATED) return null;
  let body: unknown;
  try {
    body = JSON.parse(content.toString('utf8'));
  } catch {
    console.error(`[gateway] ${PRICE_UPDATED} con JSON inválido: se descarta.`);
    return null;
  }
  const auctionId = typeof body === 'object' && body !== null ? (body as { auctionId?: unknown }).auctionId : undefined;
  if (typeof auctionId === 'string' && auctionId.trim() !== '') return auctionId;
  if (typeof auctionId === 'number' && Number.isFinite(auctionId)) return String(auctionId);
  console.error(`[gateway] ${PRICE_UPDATED} sin auctionId válido: se descarta.`);
  return null;
}

// Texto del error para el log. Si el broker rechaza la conexión, amqplib entrega un AggregateError
// con el mensaje vacío: entonces se usa su código (ECONNREFUSED) o el de su primer error.
export function describeBrokerError(error: Error): string {
  if (error.message) return error.message;
  const code = (error as Error & { code?: unknown }).code;
  if (typeof code === 'string' && code) return code;
  const first = error instanceof AggregateError ? (error.errors[0] as { code?: unknown } | undefined) : undefined;
  if (typeof first?.code === 'string' && first.code) return first.code;
  return error.name;
}

// Consumidor de PrecioActualizado (eventos.md §3). Cada copia del Gateway tiene su propia cola,
// exclusiva y con nombre del broker, para que todas reciban todos los precios. Si el broker no está,
// el Gateway funciona igual (sin precios en vivo) y amqplib reintenta la conexión.
export class RabbitPriceEvents implements PriceEvents {
  private readonly handlers: ((auctionId: string) => void)[] = [];
  private connection: Promise<RecoveringChannelModel> | null = null;

  constructor(private readonly url: string) {}

  onPriceUpdated(handler: (auctionId: string) => void): void {
    this.handlers.push(handler);
    this.connection ??= this.connect();
  }

  async stop(): Promise<void> {
    const connection = await this.connection;
    this.connection = null;
    await connection?.close();
  }

  private async connect(): Promise<RecoveringChannelModel> {
    const connection = await connect(this.url, {
      recovery: {
        maxDelay: MAX_RECONNECT_DELAY_MS,
        // No espera a la primera conexión: el Gateway arranca aunque el broker esté caído.
        waitForConnect: false,
        // Se llama tras cada (re)conexión: la cola exclusiva desaparece con la conexión anterior.
        setup: (model: ChannelModel) => this.subscribe(model),
      },
    });
    connection.on('connect', () => console.info('[gateway] conectado al broker: escuchando PrecioActualizado.'));
    connection.on('disconnect', (error: Error) => console.error(`[gateway] se perdió la conexión con el broker: ${describeBrokerError(error)}`));
    connection.on('connect-failed', (error: Error) => console.error(`[gateway] no se pudo conectar al broker: ${describeBrokerError(error)}`));
    connection.on('error', (error: Error) => console.error(`[gateway] error del broker: ${describeBrokerError(error)}`));
    return connection;
  }

  private async subscribe(model: ChannelModel): Promise<void> {
    const channel = await model.createChannel();
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
    const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true, durable: false });
    await channel.bindQueue(queue, EXCHANGE, '');
    await channel.consume(queue, (message) => {
      if (!message) return;
      // Se confirma siempre: reencolar un mensaje que no sirve en una cola exclusiva no lo arregla.
      channel.ack(message);
      const auctionId = readPriceUpdated(message.fields.routingKey, message.content);
      if (auctionId !== null) {
        for (const handler of this.handlers) handler(auctionId);
      }
    });
  }
}
