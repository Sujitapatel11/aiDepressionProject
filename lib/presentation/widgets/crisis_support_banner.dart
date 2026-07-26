import 'package:flutter/material.dart';

class CrisisSupportBanner extends StatelessWidget {
  const CrisisSupportBanner({Key? key}) : super(key: key);

  void _showCrisisModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      backgroundColor: Colors.white,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(28.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(height: 20),
              const Icon(
                Icons.health_and_safety_rounded,
                size: 52,
                color: Color(0xFFB3261E),
              ),
              const SizedBox(height: 12),
              const Text(
                "You are not alone",
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1D1B20),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "If you or someone you know is in distress, immediate confidential help is available 24/7.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF49454F),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.phone_in_talk_rounded),
                label: const Text("Call National Lifeline (988)"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB3261E),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  shape: const StadiumBorder(),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.sms_rounded),
                label: const Text("Text Crisis Support (HOME to 741741)"),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: const StadiumBorder(),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFDF2F2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF8B4B4)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.favorite_rounded,
            color: Color(0xFFB3261E),
            size: 24,
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              "Need urgent emotional support?",
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFFB3261E),
              ),
            ),
          ),
          TextButton(
            onPressed: () => _showCrisisModal(context),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFFB3261E),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            ),
            child: const Text(
              "Get Help",
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
