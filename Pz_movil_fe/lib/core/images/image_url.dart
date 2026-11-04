import '../../config/app_config.dart';

/// Las fotos de las piezas pueden venir como rutas del mismo servidor
/// (por ejemplo `/lotes/reloj-vintage.jpg`). El navegador las completa solo,
/// pero en la app hay que anteponerles el servidor de Pujaz, que se toma de
/// la URL del gateway (`PUJAZ_GRAPHQL_HTTP`). Las URLs completas no cambian.
String resolveImageUrl(String url, {String? graphqlHttpUrl}) {
  if (!url.startsWith('/')) return url;
  final base = Uri.parse(graphqlHttpUrl ?? AppConfig.fromEnvironment().httpUrl);
  return base.resolve(url).toString();
}
