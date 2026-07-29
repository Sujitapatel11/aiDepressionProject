import 'package:flutter/material.dart';
import '../../data/models/chat_message_model.dart';

class ChatScreen extends StatefulWidget {
  final String connectionId;
  final String peerUsername;

  const ChatScreen({
    Key? key,
    required this.connectionId,
    required this.peerUsername,
  }) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _msgController = TextEditingController();
  final List<ChatMessageModel> _messages = [];

  @override
  void dispose() {
    _msgController.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add(
        ChatMessageModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          connectionId: widget.connectionId,
          senderId: 1,
          text: text,
          isSelf: true,
          timestamp: DateTime.now(),
        ),
      );
      _msgController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFFE8DEF8),
              child: Text(
                widget.peerUsername[0].toUpperCase(),
                style: const TextStyle(
                  color: Color(0xFF6750A4),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.peerUsername,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const Text(
                  "Support Session",
                  style: TextStyle(fontSize: 12, color: Color(0xFF49454F)),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 1,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, idx) {
                final msg = _messages[idx];
                return Align(
                  alignment:
                      msg.isSelf ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    decoration: BoxDecoration(
                      color: msg.isSelf
                          ? const Color(0xFF6750A4)
                          : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(20),
                        topRight: const Radius.circular(20),
                        bottomLeft: Radius.circular(msg.isSelf ? 20 : 4),
                        bottomRight: Radius.circular(msg.isSelf ? 4 : 20),
                      ),
                      border: msg.isSelf
                          ? null
                          : Border.all(color: const Color(0xFFE6E1E5)),
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                        fontSize: 14.5,
                        color: msg.isSelf ? Colors.white : const Color(0xFF1D1B20),
                        height: 1.4,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgController,
                      decoration: const InputDecoration(
                        hintText: "Type a supportive message...",
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: Color(0xFF6750A4)),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}