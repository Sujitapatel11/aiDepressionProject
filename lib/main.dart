import 'package:flutter/material.dart';
import 'core/config/app_config.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/shell_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SoulCareApp());
}

class SoulCareApp extends StatefulWidget {
  const SoulCareApp({Key? key}) : super(key: key);

  @override
  State<SoulCareApp> createState() => _SoulCareAppState();
}

class _SoulCareAppState extends State<SoulCareApp> {
  final SecureStorageService _storage = SecureStorageService();
  bool _isCheckingAuth = true;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _storage.getAccessToken();
    setState(() {
      _isAuthenticated = token != null && token.isNotEmpty;
      _isCheckingAuth = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SoulCare',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: _isCheckingAuth
          ? const Scaffold(
              backgroundColor: AppTheme.lavenderBackground,
              body: Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.lavenderPrimary),
                ),
              ),
            )
          : (_isAuthenticated
              ? const SoulCareShellScreen(config: AppConfig.local)
              : const SoulCareLoginScreen(config: AppConfig.local)),
    );
  }
}
