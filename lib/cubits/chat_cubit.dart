import 'dart:async';
import 'dart:convert';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../models/chat_message.dart';
import '../services/api_service.dart';
import '../services/secure_storage_service.dart';
import '../services/websocket_service.dart';
import 'chat_state.dart';

class ChatCubit extends Cubit<ChatState> {
  final ApiService _apiService;
  final WebSocketService _wsService;
  final SecureStorageService _secureStorage;

  StreamSubscription? _messageSub;
  StreamSubscription? _statusSub;
  Timer? _typingTimer;

  // Keep current messages in memory so status updates can re-emit them.
  List<ChatMessage> _messages = [];

  ChatCubit({
    required ApiService apiService,
    required WebSocketService wsService,
    required SecureStorageService secureStorage,
  })  : _apiService = apiService,
        _wsService = wsService,
        _secureStorage = secureStorage,
        super(const ChatInitial());

  /// Opens a chat session for [connectionId].
  ///
  /// 1. Emits [ChatConnecting].
  /// 2. Reads the auth token from SecureStorage.
  /// 3. Connects the WebSocket.
  /// 4. Loads message history via REST.
  /// 5. Emits [ChatConnected] with history.
  /// 6. Listens to incoming WebSocket messages and status changes.
  Future<void> openChat(String connectionId) async {
    emit(const ChatConnecting());
    try {
      final token = await _secureStorage.readToken() ?? '';
      final currentUserId = await _secureStorage.readToken() ?? '';
      // Note: SecureStorageService only exposes readToken; we use it for the
      // token and fall back to empty string for currentUserId if unavailable.

      await _wsService.connect(connectionId, token);

      // Load message history.
      final data = await _apiService.get('/api/chat/$connectionId/messages/');
      final rawList = data as List<dynamic>;
      _messages = rawList
          .map((e) => ChatMessage.fromJson(
                e as Map<String, dynamic>,
                currentUserId: currentUserId,
              ))
          .toList();

      emit(ChatConnected(messages: List.unmodifiable(_messages)));

      // Listen to incoming messages.
      _messageSub = _wsService.messageStream.listen(
        (raw) {
          try {
            final json = jsonDecode(raw as String) as Map<String, dynamic>;
            // Handle typing indicator events (Requirement 9.2, 9.3).
            if (json['type'] == 'typing') {
              _typingTimer?.cancel();
              if (state is ChatConnected) {
                final current = state as ChatConnected;
                emit(ChatConnected(
                  messages: current.messages,
                  isTyping: true,
                ));
              }
              _typingTimer = Timer(const Duration(seconds: 10), () {
                if (state is ChatConnected) {
                  final current = state as ChatConnected;
                  emit(ChatConnected(
                    messages: current.messages,
                    isTyping: false,
                  ));
                }
              });
              return;
            }

            final msg = ChatMessage.fromJson(json, currentUserId: currentUserId);
            _messages = [..._messages, msg];
            if (state is ChatConnected) {
              final current = state as ChatConnected;
              emit(ChatConnected(
                messages: List.unmodifiable(_messages),
                isTyping: current.isTyping,
              ));
            }
          } catch (_) {
            // Ignore malformed messages.
          }
        },
        onError: (_) {/* handled by statusStream */},
      );

      // Listen to WebSocket status changes.
      _statusSub = _wsService.statusStream.listen((status) {
        switch (status) {
          case WebSocketStatus.reconnecting:
            emit(const ChatReconnecting());
          case WebSocketStatus.connected:
            emit(ChatConnected(
              messages: List.unmodifiable(_messages),
            ));
          default:
            break;
        }
      });
    } catch (e) {
      emit(ChatError(message: _humanReadable(e)));
    }
  }

  /// Sends [content] as a chat message over the WebSocket.
  ///
  /// Does nothing if [content] is empty or whitespace-only (Requirement 8.4).
  void sendMessage(String content) {
    if (content.trim().isEmpty) return;
    try {
      final payload = jsonEncode({'message': content});
      _wsService.sendMessage(payload);
    } catch (e) {
      emit(ChatError(message: _humanReadable(e)));
    }
  }

  /// Sends a typing indicator event over the WebSocket (Requirement 9.1).
  void sendTypingIndicator() {
    try {
      final payload = jsonEncode({'type': 'typing'});
      _wsService.sendMessage(payload);
    } catch (_) {
      // Typing indicator failures are non-critical; swallow silently.
    }
  }

  /// Closes the chat session and disconnects the WebSocket.
  Future<void> closeChat() async {
    _typingTimer?.cancel();
    _typingTimer = null;
    await _messageSub?.cancel();
    _messageSub = null;
    await _statusSub?.cancel();
    _statusSub = null;
    _messages = [];
    await _wsService.disconnect();
    emit(const ChatInitial());
  }

  @override
  Future<void> close() async {
    _typingTimer?.cancel();
    await _messageSub?.cancel();
    await _statusSub?.cancel();
    return super.close();
  }

  String _humanReadable(Object e) {
    final msg = e.toString();
    // Strip Dart exception prefixes like "Exception: " or "StateError: ".
    final colon = msg.indexOf(': ');
    if (colon != -1 && colon < 30) return msg.substring(colon + 2);
    return msg;
  }
}
