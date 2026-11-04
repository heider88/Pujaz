import 'package:intl/intl.dart';

// Igual que en la web: «$ 150.000». El formato de moneda de es_CO pone el símbolo al final,
// así que se usa el formato de número (puntos de miles) y el símbolo va adelante.
final _number = NumberFormat('#,##0', 'es_CO');
final _date = DateFormat('d MMM yyyy, HH:mm', 'es_CO');

String formatCop(num value) => '\$ ${_number.format(value)}';
String formatDate(String value) {
  final date = DateTime.tryParse(value);
  return date == null ? value : _date.format(date.toLocal());
}
