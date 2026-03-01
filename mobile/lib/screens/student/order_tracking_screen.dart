import 'package:flutter/material.dart';
class OrderTrackingScreen extends StatelessWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});
  @override Widget build(BuildContext context) => Scaffold(body: Center(child: Text('Tracking Order: $orderId')));
}
