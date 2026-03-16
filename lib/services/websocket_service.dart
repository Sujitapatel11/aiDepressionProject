import 'dart:async';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'secure_storage_service.dart';

enum WebSocketStatus { connecting, connected, reconnecting, disconnected }

class WebSocketService {
  final SecureStorageService _secureStorage;
  final String host;

  static const int _maxReconnectAttempts = 3;
  static const Duration _reconnectDelay = Duration(seconds: 2);

  WebSocketChannel? _channel;
  StreamSubscription? _channelSubscription;

  final _messageController = StreamController<dynamic>.broadcast();
  final _statusController = StreamController<WebSocketStatus>.broadcast();

  WebSocketStatus _status = WebSocketStatus.disconnected;
  String? _currentConnectionId;
  String? _currentToken;
  int _reconnectAttempts = 0;
  bool _intentionalDisconnect = false;

  WebSocketService({
    required SecureStorageService secureStorage,
    this.host = '10.0.2.2:8000',
  }) : _secureStorage = secureStorage;

  Stream<dynamic> get messageStream => _messageController.stream;
  Stream<WebSocketStatus> get statusStream => _statusController.stream;
  bool get isConnected => _status == WebSocketStatus.connected;

  Future<void> connect(String connectionId, String token) async {
    // Requirement 10.2: refuse to connect if no valid token in SecureStorage
    final storedToken = await _secureStorage.readToken();
    if (storedToken == null || storedToken.isEmpty) {
      throw StateError('No valid auth token in SecureStorage');
    }

    _intentionalDisconnect = false;
    _currentConnectionId = connectionId;
    _currentToken = token;
    _reconnectAttempts = 0;

    await _openConnection(connectionId, token);
  }

  Future<void> _openConnection(String connectionId, String token) async {
    _setStatus(WebSocketStatus.connecting);

    final uri = Uri.parse(
      'ws://$host/ws/chat/$connectionId/?token=$token',
    );

    _channel = WebSocketChannel.connect(uri);

    _channelSubscription = _channel!.stream.listen(
      (message) {
        if (_status != WebSocketStatus.connected) {
          _setStatus(WebSocketStatus.connected);
          _reconnectAttempts = 0;
        }
        _messageController.add(message);
      },
      onDone: () {
        if (!_intentionalDisconnect) {
          _handleUnexpectedDisconnect();
        } else {
          _setStatus(WebSocketStatus.disconnected);
        }
      },
      onError: (error) {
        if (!_intentionalDisconnect) {
          _handleUnexpectedDisconnect();
        } else {
          _setStatus(WebSocketStatus.disconnected);
        }
      },
    );

    // Mark as connected once the channel is set up
    // The stream listener will confirm on first message, but we optimistically
    // set connected after the channel is opened.
    _setStatus(WebSocketStatus.connected);
  }

  void _handleUnexpectedDisconnect() {
    if (_reconnectAttempts < _maxReconnectAttempts) {
      _reconnectAttempts++;
      _setStatus(WebSocketStatus.reconnecting);
      Future.delayed(_reconnectDelay, () async {
        if (!_intentionalDisconnect &&
            _currentConnectionId != null &&
            _currentToken != null) {
          await _channelSubscription?.cancel();
          _channelSubscription = null;
          _channel = null;
          await _openConnection(_currentConnectionId!, _currentToken!);
        }
      });
    } else {
      _setStatus(WebSocketStatus.disconnected);
    }
  }

  Future<void> disconnect() async {
    _intentionalDisconnect = true;
    await _channelSubscription?.cancel();
    _channelSubscription = null;
    await _channel?.sink.close();
    _channel = null;
    _currentConnectionId = null;
    _currentToken = null;
    _reconnectAttempts = 0;
    _setStatus(WebSocketStatus.disconnected);
  }

  void sendMessage(String payload) {
    if (_channel == null || _status != WebSocketStatus.connected) {
      throw StateError('WebSocket is not connected');
    }
    _channel!.sink.add(payload);
  }

  void _setStatus(WebSocketStatus status) {
    _status = status;
    _statusController.add(status);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _statusController.close();
  }
}
