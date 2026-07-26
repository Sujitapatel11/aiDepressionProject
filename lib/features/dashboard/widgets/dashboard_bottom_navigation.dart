import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable Material Design 3 Bottom Navigation Component
class DashboardBottomNavigation extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  const DashboardBottomNavigation({
    Key? key,
    required this.selectedIndex,
    required this.onDestinationSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: onDestinationSelected,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      indicatorColor: AppTheme.lavenderPrimary.withOpacity(0.18),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home_rounded, color: AppTheme.lavenderPrimary),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.book_outlined),
          selectedIcon: Icon(Icons.book_rounded, color: AppTheme.lavenderPrimary),
          label: 'Journal',
        ),
        NavigationDestination(
          icon: Icon(Icons.people_outline_rounded),
          selectedIcon: Icon(Icons.people_rounded, color: AppTheme.lavenderPrimary),
          label: 'Community',
        ),
        NavigationDestination(
          icon: Icon(Icons.insights_outlined),
          selectedIcon: Icon(Icons.insights_rounded, color: AppTheme.lavenderPrimary),
          label: 'Insights',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outline_rounded),
          selectedIcon: Icon(Icons.person_rounded, color: AppTheme.lavenderPrimary),
          label: 'Profile',
        ),
      ],
    );
  }
}
