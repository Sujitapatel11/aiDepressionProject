import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/datasources/insights_remote_datasource.dart';
import '../../data/datasources/journal_remote_datasource.dart';
import '../../data/datasources/support_remote_datasource.dart';
import '../controllers/insights_controller.dart';
import '../controllers/journal_controller.dart';
import '../controllers/mood_controller.dart';
import '../controllers/support_controller.dart';
import 'connect_screen.dart';
import 'dashboard_screen.dart';
import 'insights_screen.dart';
import 'journal_screen.dart';
import 'mood_checkin_sheet.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';

class SoulCareShellScreen extends StatefulWidget {
  final AppConfig config;

  const SoulCareShellScreen({
    Key? key,
    this.config = AppConfig.dev,
  }) : super(key: key);

  @override
  State<SoulCareShellScreen> createState() => _SoulCareShellScreenState();
}

class _SoulCareShellScreenState extends State<SoulCareShellScreen> {
  int _currentIndex = 0;

  late final MoodController _moodController;
  late final JournalController _journalController;
  late final InsightsController _insightsController;
  late final SupportController _supportController;

  @override
  void initState() {
    super.initState();
    final storageService = SecureStorageService();

    _moodController = MoodController();

    _journalController = JournalController(
      dataSource: JournalRemoteDataSource(config: widget.config),
      storageService: storageService,
    );

    _insightsController = InsightsController(
      dataSource: InsightsRemoteDataSource(config: widget.config),
      storageService: storageService,
    );

    _supportController = SupportController(
      dataSource: SupportRemoteDataSource(config: widget.config),
      storageService: storageService,
    );

    // Initial data fetch
    _journalController.loadJournals();
    _insightsController.loadInsights();
    _supportController.loadSupportData();
  }

  @override
  void dispose() {
    _moodController.dispose();
    _journalController.dispose();
    _insightsController.dispose();
    _supportController.dispose();
    super.dispose();
  }

  void _openMoodSheet() {
    MoodCheckInSheet.show(context, _moodController, () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text("Mood logged successfully!"),
          backgroundColor: const Color(0xFF2D6A4F),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      DashboardScreen(
        moodController: _moodController,
        journalController: _journalController,
        onOpenMoodSheet: _openMoodSheet,
      ),
      JournalScreen(controller: _journalController),
      InsightsScreen(controller: _insightsController),
      ConnectScreen(controller: _supportController),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          HapticFeedback.selectionClick();
          setState(() => _currentIndex = idx);
        },
        indicatorColor: const Color(0xFFE8DEF8),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded, color: Color(0xFF6750A4)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon:
                Icon(Icons.menu_book_rounded, color: Color(0xFF6750A4)),
            label: 'Journal',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon:
                Icon(Icons.auto_awesome_rounded, color: Color(0xFF6750A4)),
            label: 'Insights',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon:
                Icon(Icons.people_rounded, color: Color(0xFF6750A4)),
            label: 'Connect',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded, color: Color(0xFF6750A4)),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}