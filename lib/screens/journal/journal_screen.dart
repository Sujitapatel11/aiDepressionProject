import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/journal_cubit.dart';
import '../../services/api_service.dart';
import 'journal_list_screen.dart';

/// Entry point for the Journal tab.
///
/// Provides [JournalCubit] to the subtree and delegates rendering to
/// [JournalListScreen]. When main.dart wires up a top-level
/// MultiBlocProvider, this BlocProvider can be removed.
class JournalScreen extends StatelessWidget {
  const JournalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => JournalCubit(
        apiService: context.read<ApiService>(),
      ),
      child: const JournalListScreen(),
    );
  }
}
