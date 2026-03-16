import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'cubits/auth_cubit.dart';
import 'cubits/auth_state.dart';
import 'cubits/chat_cubit.dart';
import 'cubits/home_cubit.dart';
import 'cubits/insights_cubit.dart';
import 'cubits/journal_cubit.dart';
import 'cubits/support_cubit.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/journal/journal_create_screen.dart';
import 'screens/shell/main_shell.dart';
import 'services/api_service.dart';
import 'services/secure_storage_service.dart';
import 'services/websocket_service.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const MindSpaceApp());
}

class MindSpaceApp extends StatelessWidget {
  const MindSpaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Singletons created once at the top of the widget tree.
    final secureStorage = SecureStorageService();
    final wsService = WebSocketService(secureStorage: secureStorage);
    final apiService = ApiService(secureStorage: secureStorage);

    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<SecureStorageService>.value(value: secureStorage),
        RepositoryProvider<ApiService>.value(value: apiService),
        RepositoryProvider<WebSocketService>.value(value: wsService),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<AuthCubit>(
            create: (_) => AuthCubit(
              apiService: apiService,
              secureStorage: secureStorage,
            ),
          ),
          BlocProvider<HomeCubit>(
            create: (_) => HomeCubit(apiService: apiService),
          ),
          BlocProvider<JournalCubit>(
            create: (_) => JournalCubit(apiService: apiService),
          ),
          BlocProvider<InsightsCubit>(
            create: (_) => InsightsCubit(apiService: apiService),
          ),
          BlocProvider<SupportCubit>(
            create: (_) => SupportCubit(apiService: apiService),
          ),
          BlocProvider<ChatCubit>(
            create: (_) => ChatCubit(
              apiService: apiService,
              wsService: wsService,
              secureStorage: secureStorage,
            ),
          ),
        ],
        child: _AppRoot(apiService: apiService),
      ),
    );
  }
}

/// Root widget that wires the [onUnauthenticated] callback and calls
/// [AuthCubit.checkAuthStatus] on first frame (Requirement 1.6, 1.9).
class _AppRoot extends StatefulWidget {
  final ApiService apiService;

  const _AppRoot({required this.apiService});

  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  @override
  void initState() {
    super.initState();
    // Wire the 401 callback so any unauthenticated response triggers logout.
    widget.apiService.onUnauthenticated = () {
      if (mounted) {
        context.read<AuthCubit>().logout();
      }
    };
    // Auto-navigate if a token already exists in SecureStorage.
    context.read<AuthCubit>().checkAuthStatus();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          Navigator.of(context).pushNamedAndRemoveUntil('/', (_) => false);
        } else if (state is AuthAuthenticated) {
          Navigator.of(context).pushNamedAndRemoveUntil('/main', (_) => false);
        }
      },
      child: MaterialApp(
        title: 'MindSpace',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        initialRoute: '/',
        routes: {
          '/': (_) => const LoginScreen(),
          '/main': (_) => const MainShell(),
          '/signup': (_) => const SignupScreen(),
          '/forgot-password': (_) => const ForgotPasswordScreen(),
          '/journal/create': (ctx) => BlocProvider<JournalCubit>.value(
                value: ctx.read<JournalCubit>(),
                child: const JournalCreateScreen(),
              ),
        },
      ),
    );
  }
}
