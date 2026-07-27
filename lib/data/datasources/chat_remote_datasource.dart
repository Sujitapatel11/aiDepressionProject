import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../../core/network/failure.dart';
import '../models/chat_message_model.dart';

import '../../core/network/ssl_pinning_client.dart';

class ChatRemoteDataSource {
  final http.Client client;
  final AppConfig config;

  ChatRemoteDataSource({http.Client? client, this.config = AppConfig.dev})
      : client = client ?? SslPinningClient.createClient(config);

  Future<List<ChatMessageModel>> fetchMessageHistory(
    String token,
    String connectionId,
    int currentUserId,
  ) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/chat/$connectionId/messages/");
    try {
      final response = await client.get(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      ).timeout(config.apiTimeout);

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return data
            .map((e) => ChatMessageModel.fromJson(e, currentUserId: currentUserId))
            .toList();
      } else {
        return [];
      }
    } on SocketException {
      throw const NetworkFailure();
    } catch (_) {
      return [];
    }
  }
}
