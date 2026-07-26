import 'package:flutter/material.dart';
import '../controllers/mood_controller.dart';

class MoodCheckInSheet extends StatelessWidget {
  final MoodController controller;
  final VoidCallback onSaved;

  const MoodCheckInSheet({
    Key? key,
    required this.controller,
    required this.onSaved,
  }) : super(key: key);

  static void show(BuildContext context, MoodController controller, VoidCallback onSaved) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => AnimatedBuilder(
        animation: controller,
        builder: (context, _) => MoodCheckInSheet(
          controller: controller,
          onSaved: onSaved,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            "How are you feeling right now?",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1D1B20),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            "Take a gentle pause and tune into your emotions.",
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Color(0xFF49454F)),
          ),
          const SizedBox(height: 24),

          // Mood Emoji Selector Row
          Row(
            mainAxisAlignment: MainState.spaceAround,
            children: controller.moodOptions.map((opt) {
              final isSelected = controller.selectedMood == opt['id'];
              return GestureDetector(
                onTap: () => controller.selectMood(opt['id']!),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFE8DEF8)
                        : const Color(0xFFF8F7FC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF6750A4)
                          : const Color(0xFFE6E1E5),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        opt['emoji']!,
                        style: const TextStyle(fontSize: 28),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        opt['label']!,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected
                              ? const Color(0xFF6750A4)
                              : const Color(0xFF49454F),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Mood Intensity Slider
          Row(
            mainAxisAlignment: MainState.spaceBetween,
            children: [
              const Text(
                "Intensity",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              Text(
                "${controller.intensity} / 5",
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF6750A4),
                ),
              ),
            ],
          ),
          Slider(
            value: controller.intensity.toDouble(),
            min: 1,
            max: 5,
            divisions: 4,
            activeColor: const Color(0xFF6750A4),
            onChanged: (val) => controller.updateIntensity(val),
          ),
          const SizedBox(height: 16),

          // Trigger Tags Chips
          const Text(
            "What's influencing your mood?",
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: controller.availableTriggers.map((trig) {
              final isSel = controller.selectedTriggers.contains(trig);
              return FilterChip(
                selected: isSel,
                label: Text(trig),
                selectedColor: const Color(0xFFE8F5E9),
                checkmarkColor: const Color(0xFF2D6A4F),
                labelStyle: TextStyle(
                  color: isSel ? const Color(0xFF2D6A4F) : const Color(0xFF49454F),
                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (_) => controller.toggleTrigger(trig),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // Log Mood Button
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop();
                onSaved();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6750A4),
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
              ),
              child: const Text(
                "Save Mood Check-in",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
