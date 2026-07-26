import 'package:flutter/material.dart';
import '../controllers/journal_controller.dart';
import '../controllers/mood_controller.dart';
import '../widgets/crisis_support_banner.dart';
import '../widgets/skeleton_loader.dart';
import 'mood_checkin_sheet.dart';

class DashboardScreen extends StatelessWidget {
  final MoodController moodController;
  final JournalController journalController;
  final VoidCallback onOpenMoodSheet;

  const DashboardScreen({
    Key? key,
    required this.moodController,
    required this.journalController,
    required this.onOpenMoodSheet,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await journalController.loadJournals();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                // Header Greeting
                Row(
                  mainAxisAlignment: MainState.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAlignment.start,
                      children: const [
                        Text(
                          "Welcome Back, Friend 🌿",
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1D1B20),
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          "Take a gentle breath today.",
                          style: TextStyle(fontSize: 14, color: Color(0xFF49454F)),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8DEF8),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.local_fire_department_rounded,
                              color: Color(0xFF6750A4), size: 18),
                          SizedBox(width: 4),
                          Text(
                            "7 Days",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF6750A4),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Crisis Support Quick Banner
                const CrisisSupportBanner(),
                const SizedBox(height: 24),

                // Mood Check-in Card
                AnimatedBuilder(
                  animation: moodController,
                  builder: (context, _) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFE8DEF8), Color(0xFFE8F5E9)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6750A4).withOpacity(0.08),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainState.spaceBetween,
                            children: [
                              const Text(
                                "Today's Mood",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1D1B20),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  moodController.selectedMood.toUpperCase(),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF6750A4),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            "Logging your mood helps track emotional patterns over time.",
                            style: TextStyle(
                              fontSize: 13.5,
                              color: Color(0xFF49454F),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: onOpenMoodSheet,
                            icon: const Icon(Icons.add_reaction_rounded),
                            label: const Text("Log Mood Check-in"),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6750A4),
                              foregroundColor: Colors.white,
                              shape: const StadiumBorder(),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 28),

                // Recent Journal Entries Header
                Row(
                  mainAxisAlignment: MainState.spaceBetween,
                  children: const [
                    Text(
                      "Recent Reflections",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1D1B20),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Journal Entries Carousel / List with Skeleton loading
                AnimatedBuilder(
                  animation: journalController,
                  builder: (context, _) {
                    if (journalController.isLoading) {
                      return Column(
                        children: const [
                          SkeletonLoader(width: double.infinity, height: 90),
                          SizedBox(height: 12),
                          SkeletonLoader(width: double.infinity, height: 90),
                        ],
                      );
                    }

                    if (journalController.journals.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE6E1E5)),
                        ),
                        child: Column(
                          children: const [
                            Icon(Icons.edit_note_rounded,
                                size: 48, color: Color(0xFF79747E)),
                            SizedBox(height: 8),
                            Text(
                              "No reflection entries yet",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            SizedBox(height: 4),
                            Text(
                              "Write your first reflection in the Journal tab.",
                              style: TextStyle(
                                  fontSize: 13, color: Color(0xFF49454F)),
                            ),
                          ],
                        ),
                      );
                    }

                    return Column(
                      children: journalController.journals.take(3).map((entry) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE6E1E5)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8DEF8),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(
                                  Icons.menu_book_rounded,
                                  color: Color(0xFF6750A4),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAlignment.start,
                                  children: [
                                    Text(
                                      entry.title,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF1D1B20),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      entry.content,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Color(0xFF49454F),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
