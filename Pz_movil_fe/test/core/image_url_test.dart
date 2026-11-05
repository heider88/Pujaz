import 'package:flutter_test/flutter_test.dart';

import 'package:pujaz_mobile/core/images/image_url.dart';

void main() {
  test('antepone el servidor de Pujaz a las rutas relativas', () {
    expect(
      resolveImageUrl('/lotes/reloj-vintage.jpg', graphqlHttpUrl: 'http://10.0.2.2:8080/graphql'),
      'http://10.0.2.2:8080/lotes/reloj-vintage.jpg',
    );
  });

  test('deja igual las URLs completas', () {
    const url = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Pocket_watch_with_chain.jpg';
    expect(resolveImageUrl(url, graphqlHttpUrl: 'http://10.0.2.2:8080/graphql'), url);
  });
}
