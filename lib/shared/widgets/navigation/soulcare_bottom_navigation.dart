import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Navigation Item Model for SoulCare Navigation Bar
class NavigationItemData {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const NavigationItemData({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

/// Custom Material 3 Bottom Navigation Bar Component for SoulCare.
class SoulCareBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<NavigationItemData> items;

  const SoulCareBottomNavigation({
    Key? key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: theme.brightness == Brightness.light
            ? AppShadows.lightMedium
            : AppShadows.darkMedium,
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: onTap,
        backgroundColor: colorScheme.surface,
        indicatorColor: colorScheme.primaryContainer,
        elevation: 0,
        destinations: items.map((item) {
          return NavigationDestination(
            icon: Icon(item.icon, color: colorScheme.onSurfaceVariant),
            selectedIcon: Icon(item.selectedIcon, color: colorScheme.primary),
            label: item.label,
          );
        }).toList(),
      ),
    );
  }
}
