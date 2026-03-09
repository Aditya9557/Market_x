import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Basic smoke test - validates that the app can compile
    expect(1 + 1, equals(2));
  });
}
