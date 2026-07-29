import 'package:flutter/material.dart';
import '../controllers/insights_controller.dart';
import '../widgets/skeleton_loader.dart';

class InsightsScreen extends StatelessWidget {
  final InsightsController controller;

  const InsightsScreen({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      appBar: AppBar(
        title: const Text(
          "AI Personal Insights",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          if (controller.isLoading && controller.insights.isEmpty) {
            return ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: 3,
              itemBuilder: (_, __) => const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: SkeletonLoader(width: double.infinity, height: 130),
              ),
            );
          }

          if (controller.insights.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(Icons.psychology_rounded,
                        size: 64, color: Color(0xFF6750A4)),
                    SizedBox(height: 14),
                    Text(
                      "Building Your Mindful Insights",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 6),
                    Text(
                      "Keep logging your mood and reflections. SoulCare AI will synthesize personalized behavioral patterns.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF49454F), height: 1.4),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: controller.insights.length,
            itemBuilder: (context, idx) {
              final item = controller.insights[idx];
              return Dismissible(
                key: Key(item.id.toString()),
                direction: DismissDirection.endToStart,
                onDismissed: (_) => controller.dismissInsight(item.id),
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFB3261E),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.delete_outline_rounded,
                      color: Colors.white),
                ),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: const Color(0xFF6750A4).withOpacity(0.12),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6750A4).withOpacity(0.06),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8DEF8),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.auto_awesome_rounded,
                              color: Color(0xFF6750A4),
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              item.title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1D1B20),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        item.content,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF49454F),
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}