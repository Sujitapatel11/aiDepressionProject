import 'package:flutter/material.dart';
import '../controllers/support_controller.dart';

class ConnectScreen extends StatelessWidget {
  final SupportController controller;

  const ConnectScreen({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      appBar: AppBar(
        title: const Text(
          "Peer Support Network",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                // Supportive Community Banner
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFC8E6C9)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.people_alt_rounded,
                        size: 36,
                        color: Color(0xFF2D6A4F),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAlignment.start,
                          children: [
                            Text(
                              "Empathetic Peer Circles",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1B5E20),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Connect with supportive individuals on similar wellness journeys.",
                              style: TextStyle(
                                  fontSize: 13, color: Color(0xFF2D6A4F)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                const Text(
                  "Active Support Partners",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1D1B20),
                  ),
                ),
                const SizedBox(height: 12),

                if (controller.connections.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE6E1E5)),
                    ),
                    child: const Text(
                      "No active connections yet. Request a peer match below.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF49454F)),
                    ),
                  )
                else
                  Column(
                    children: controller.connections.map((item) {
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFFE8DEF8),
                          child: Text(item.username[0].toUpperCase()),
                        ),
                        title: Text(item.username),
                        subtitle: Text(item.isOnline ? "Online" : "Offline"),
                        trailing: const Icon(Icons.chevron_right_rounded),
                      );
                    }).toList(),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
