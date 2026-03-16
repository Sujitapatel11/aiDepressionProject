import 'package:flutter/material.dart';

/// Placeholder ChatListScreen — shows the list of active connections to chat with.
/// Will be fully implemented in Task 14.
class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: const Center(child: Text('Chat')),
    );
  }
}
