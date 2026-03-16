import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../cubits/chat_cubit.dart';
import '../../cubits/chat_state.dart';
import '../../models/chat_message.dart';
import '../../theme/app_theme.dart';

class ChatScreen extends StatefulWidget {
  final String connectionId;

  const ChatScreen({super.key, required this.connectionId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<ChatCubit>().openChat(widget.connectionId);
  }

  @override
  void dispose() {
    context.read<ChatCubit>().closeChat();
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    final content = _inputController.text;
    if (content.trim().isEmpty) return;
    context.read<ChatCubit>().sendMessage(content);
    _inputController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: BlocConsumer<ChatCubit, ChatState>(
        listener: (context, state) {
          if (state is ChatConnected) {
            _scrollToBottom();
          }
        },
        builder: (context, state) {
          if (state is ChatConnecting) {
            return const _ConnectingView();
          }

          if (state is ChatError) {
            return _ErrorView(message: state.message);
          }

          if (state is ChatReconnecting) {
            // Show reconnecting banner over an empty message area.
            return const _ReconnectingView();
          }

          if (state is ChatConnected) {
            return _ConnectedView(
              state: state,
              scrollController: _scrollController,
              inputController: _inputController,
              onSend: _sendMessage,
              onTyping: () =>
                  context.read<ChatCubit>().sendTypingIndicator(),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// ── Connecting ────────────────────────────────────────────────────────────────

class _ConnectingView extends StatelessWidget {
  const _ConnectingView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Connecting...'),
        ],
      ),
    );
  }
}

// ── Reconnecting ──────────────────────────────────────────────────────────────

class _ReconnectingView extends StatelessWidget {
  const _ReconnectingView();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          color: AppTheme.primaryColor.withOpacity(0.15),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          child: Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text(
                'Reconnecting...',
                style: AppTheme.bodySmall
                    .copyWith(color: AppTheme.primaryColor),
              ),
            ],
          ),
        ),
        const Expanded(child: SizedBox.shrink()),
      ],
    );
  }
}

// ── Error ─────────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          message,
          style: AppTheme.bodyMedium.copyWith(color: AppTheme.errorColor),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

// ── Connected ─────────────────────────────────────────────────────────────────

class _ConnectedView extends StatelessWidget {
  const _ConnectedView({
    required this.state,
    required this.scrollController,
    required this.inputController,
    required this.onSend,
    required this.onTyping,
  });

  final ChatConnected state;
  final ScrollController scrollController;
  final TextEditingController inputController;
  final VoidCallback onSend;
  final VoidCallback onTyping;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: scrollController,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            itemCount: state.messages.length + (state.isTyping ? 1 : 0),
            itemBuilder: (context, index) {
              if (state.isTyping && index == state.messages.length) {
                return const _TypingIndicator();
              }
              return _MessageBubble(message: state.messages[index]);
            },
          ),
        ),
        _InputBar(
          controller: inputController,
          onSend: onSend,
          onTyping: onTyping,
        ),
      ],
    );
  }
}

// ── Message bubble ────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isSelf = message.isSelf;
    final local = message.timestamp.toLocal();
    final timeStr =
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';

    return Align(
      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        decoration: BoxDecoration(
          color: isSelf ? AppTheme.primaryColor : const Color(0xFFE0E0E0),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isSelf ? 16 : 4),
            bottomRight: Radius.circular(isSelf ? 4 : 16),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment:
              isSelf ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: AppTheme.bodyMedium.copyWith(
                color: isSelf ? AppTheme.onPrimaryColor : AppTheme.onSurfaceColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              timeStr,
              style: AppTheme.caption.copyWith(
                color: isSelf
                    ? AppTheme.onPrimaryColor.withOpacity(0.7)
                    : const Color(0xFF9E9E9E),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Typing indicator ──────────────────────────────────────────────────────────

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFE0E0E0),
          borderRadius: BorderRadius.circular(16),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                final opacity =
                    ((_controller.value * 3 - i).clamp(0.0, 1.0));
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Opacity(
                    opacity: opacity < 0.3 ? 0.3 : opacity,
                    child: const CircleAvatar(
                      radius: 4,
                      backgroundColor: Color(0xFF9E9E9E),
                    ),
                  ),
                );
              }),
            );
          },
        ),
      ),
    );
  }
}

// ── Input bar ─────────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.onSend,
    required this.onTyping,
  });

  final TextEditingController controller;
  final VoidCallback onSend;
  final VoidCallback onTyping;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: const BoxDecoration(
          color: AppTheme.surfaceColor,
          border: Border(
            top: BorderSide(color: Color(0xFFE0E0E0)),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: (_) => onTyping(),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                minLines: 1,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText: 'Type a message…',
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 48,
              height: 48,
              child: IconButton(
                onPressed: onSend,
                icon: const Icon(Icons.send),
                color: AppTheme.primaryColor,
                tooltip: 'Send',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
