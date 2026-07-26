import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/peer_user_dto.dart';
import '../dto/support_connection_dto.dart';
import '../dto/support_request_dto.dart';

/// Remote HTTP Data Source for Community & Peer Support REST endpoints (/api/support/)
class CommunityRemoteDataSource {
  final AppConfig config;
  final http.Client client;

  CommunityRemoteDataSource({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  /// GET /api/support/users/?mode=smart
  Future<List<PeerUserDto>> fetchPeerSuggestions(String accessToken, {String mode = 'smart'}) async {
    final url = Uri.parse('${config.baseUrl}/api/support/users/?mode=$mode');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((item) => PeerUserDto.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception("Failed to fetch peer suggestions.");
    }
  }

  /// GET /api/support/connections/
  Future<List<SupportConnectionDto>> fetchActiveConnections(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/support/connections/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((item) => SupportConnectionDto.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception("Failed to fetch active peer connections.");
    }
  }

  /// GET /api/support/requests/
  Future<List<SupportRequestDto>> fetchIncomingRequests(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/support/requests/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((item) => SupportRequestDto.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception("Failed to fetch incoming support requests.");
    }
  }

  /// POST /api/support/send/<user_id>/
  Future<SupportRequestDto> sendSupportRequest(String accessToken, int userId) async {
    final url = Uri.parse('${config.baseUrl}/api/support/send/$userId/');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return SupportRequestDto.fromJson(json);
    } else {
      throw Exception("Failed to send support request.");
    }
  }

  /// POST /api/support/accept/<request_id>/
  Future<SupportConnectionDto> acceptRequest(String accessToken, int requestId) async {
    final url = Uri.parse('${config.baseUrl}/api/support/accept/$requestId/');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return SupportConnectionDto.fromJson(json);
    } else {
      throw Exception("Failed to accept support request.");
    }
  }

  /// POST /api/support/reject/<request_id>/
  Future<bool> rejectRequest(String accessToken, int requestId) async {
    final url = Uri.parse('${config.baseUrl}/api/support/reject/$requestId/');
    final response = await client.post(
      url,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception("Failed to reject support request.");
    }
  }

  /// POST /api/support/connections/<connection_id>/block/
  Future<bool> blockConnection(String accessToken, String connectionId) async {
    final url = Uri.parse('${config.baseUrl}/api/support/connections/$connectionId/block/');
    final response = await client.post(
      url,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception("Failed to block peer connection.");
    }
  }

  /// POST /api/support/connections/<connection_id>/disconnect/
  Future<bool> disconnectConnection(String accessToken, String connectionId) async {
    final url = Uri.parse('${config.baseUrl}/api/support/connections/$connectionId/disconnect/');
    final response = await client.post(
      url,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception("Failed to disconnect peer connection.");
    }
  }
}
