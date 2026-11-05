import { readFileSync } from 'node:fs';
import { ConfigError, SCHEMA_PATH, type Config } from './config.js';
import { createGatewayPubSub } from './core/pubsub.js';
import { HttpAuctionClient } from './infrastructure/clients/http/auction.http.js';
import { HttpDeliveryClient } from './infrastructure/clients/http/delivery.http.js';
import { HttpItemClient } from './infrastructure/clients/http/item.http.js';
import { HttpNotificationClient } from './infrastructure/clients/http/notification.http.js';
import { HttpUserClient } from './infrastructure/clients/http/user.http.js';
import { HttpWalletClient } from './infrastructure/clients/http/wallet.http.js';
import { MockAuctionClient } from './infrastructure/clients/mock/auction.mock.js';
import { MockDeliveryClient } from './infrastructure/clients/mock/delivery.mock.js';
import { MockItemClient } from './infrastructure/clients/mock/item.mock.js';
import { MockNotificationClient } from './infrastructure/clients/mock/notification.mock.js';
import { MockUserClient } from './infrastructure/clients/mock/user.mock.js';
import { MockWalletClient } from './infrastructure/clients/mock/wallet.mock.js';
import { MemoryPriceEvents } from './infrastructure/events/memory.price-events.js';
import { RabbitPriceEvents } from './infrastructure/events/rabbitmq.price-events.js';
import { HttpClient } from './infrastructure/http/http-client.js';
import {
  AuctionsService,
  createAuctionsResolvers,
  type AuctionClient,
  type PriceEvents,
} from './modules/auctions/index.js';
import { AuthService, TokenService, createAuthResolvers } from './modules/auth/index.js';
import { CatalogService, createCatalogResolvers, type ItemClient } from './modules/catalog/index.js';
import { DeliveriesService, createDeliveriesResolvers, type DeliveryClient } from './modules/deliveries/index.js';
import {
  NotificationsService,
  createNotificationsResolvers,
  type NotificationClient,
} from './modules/notifications/index.js';
import { UsersService, createUsersResolvers, type UserClient } from './modules/users/index.js';
import { WalletService, createWalletResolvers, type WalletClient } from './modules/wallet/index.js';
import { createGateway } from './server.js';

export interface Clients {
  userClient: UserClient;
  itemClient: ItemClient;
  auctionClient: AuctionClient;
  walletClient: WalletClient;
  deliveryClient: DeliveryClient;
  notificationClient: NotificationClient;
  // De dónde llegan los avisos de precio: el broker con los MS reales, o el mock de subastas.
  priceEvents: PriceEvents;
}

// Único lugar donde se cablean las dependencias.
export function buildGateway(config: Config, clients: Clients = createClients(config)) {
  const tokenService = new TokenService(config.jwtSecret, config.jwtExpiresIn);
  const authService = new AuthService(clients.userClient, tokenService);
  const usersService = new UsersService(clients.userClient);
  const catalogService = new CatalogService(clients.itemClient);
  const pubsub = createGatewayPubSub();
  const auctionsService = new AuctionsService(
    clients.auctionClient,
    catalogService,
    pubsub,
    clients.walletClient,
    clients.userClient,
    clients.priceEvents,
  );
  const walletService = new WalletService(clients.walletClient);
  const deliveriesService = new DeliveriesService(clients.deliveryClient);
  const notificationsService = new NotificationsService(clients.notificationClient);

  const authResolvers = createAuthResolvers(authService);
  const usersResolvers = createUsersResolvers(usersService);
  const catalogResolvers = createCatalogResolvers(catalogService);
  const auctionsResolvers = createAuctionsResolvers(auctionsService);
  const walletResolvers = createWalletResolvers(walletService);
  const deliveriesResolvers = createDeliveriesResolvers(deliveriesService, auctionsResolvers.loadAuctionById);
  const notificationsResolvers = createNotificationsResolvers(notificationsService, auctionsResolvers.loadAuctionById);

  const yoga = createGateway({
    typeDefs: readFileSync(SCHEMA_PATH, 'utf8'),
    resolvers: {
      Query: {
        ...usersResolvers.Query,
        ...catalogResolvers.Query,
        ...auctionsResolvers.Query,
        ...walletResolvers.Query,
        ...deliveriesResolvers.Query,
        ...notificationsResolvers.Query,
      },
      Mutation: {
        ...authResolvers.Mutation,
        ...usersResolvers.Mutation,
        ...walletResolvers.Mutation,
        ...auctionsResolvers.Mutation,
        ...deliveriesResolvers.Mutation,
      },
      Subscription: { ...auctionsResolvers.Subscription },
      Item: { ...auctionsResolvers.Item },
      Auction: { ...auctionsResolvers.Auction },
      WalletMovement: { ...auctionsResolvers.WalletMovement },
      Delivery: { ...deliveriesResolvers.Delivery },
      Notification: { ...notificationsResolvers.Notification },
    },
    corsOrigin: config.corsOrigin,
    // Token inválido o de un usuario eliminado: las operaciones públicas siguen y las protegidas
    // responden UNAUTHENTICATED.
    getUserContext: (token: string | null) => (token === null ? Promise.resolve(null) : authService.resolveUser(token)),
  });

  return { yoga, tokenService, priceEvents: clients.priceEvents };
}

// USE_MOCKS decide qué implementación se inyecta; los servicios no notan la diferencia.
export function createClients(config: Config): Clients {
  return config.useMocks ? createMockClients() : createHttpClients(config);
}

export function createHttpClients(config: Config): Clients {
  const url = (value: string | null, name: string) => {
    if (!value) throw new ConfigError(`Falta ${name} para usar los MS reales.`);
    return value;
  };
  const usuarios = new HttpClient('MS usuarios', url(config.msUsuariosUrl, 'MS_USUARIOS_URL'));
  const subastas = new HttpClient('MS subastas', url(config.msSubastasUrl, 'MS_SUBASTAS_URL'));
  const billetera = new HttpClient('MS billetera', url(config.msBilleteraUrl, 'MS_BILLETERA_URL'));
  const catalogo = new HttpClient('MS catálogo', url(config.msCatalogoUrl, 'MS_CATALOGO_URL'));
  const postpuja = new HttpClient('MS postpuja', url(config.msPostpujaUrl, 'MS_POSTPUJA_URL'));
  const notificaciones = new HttpClient('MS notificaciones', url(config.msNotificacionesUrl, 'MS_NOTIFICACIONES_URL'));
  return {
    userClient: new HttpUserClient(usuarios),
    itemClient: new HttpItemClient(catalogo),
    auctionClient: new HttpAuctionClient(subastas),
    walletClient: new HttpWalletClient(billetera),
    deliveryClient: new HttpDeliveryClient(postpuja),
    notificationClient: new HttpNotificationClient(notificaciones),
    priceEvents: new RabbitPriceEvents(url(config.rabbitmqUrl, 'RABBITMQ_URL')),
  };
}

export function createMockClients(): Clients {
  const userClient = new MockUserClient();
  const walletClient = new MockWalletClient();
  const priceEvents = new MemoryPriceEvents();
  return {
    userClient,
    itemClient: new MockItemClient(),
    auctionClient: new MockAuctionClient({ wallet: walletClient, priceEvents }),
    walletClient,
    deliveryClient: new MockDeliveryClient(),
    notificationClient: new MockNotificationClient(),
    priceEvents,
  };
}
