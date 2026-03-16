import 'package:equatable/equatable.dart';

class SupportConnection extends Equatable {
  final String id;
  final String peerId;
  final String peerAlias;
  final String connectionId;
  final DateTime createdAt;

  const SupportConnection({
    required this.id,
    required this.peerId,
    required this.peerAlias,
    required this.connectionId,
    required this.createdAt,
  });

  factory SupportConnection.fromJson(Map<String, dynamic> json) {
    return SupportConnection(
      id: json['id'].toString(),
      peerId: json['peer_id'].toString(),
      peerAlias: json['peer_alias'] as String,
      connectionId: json['connection_id'].toString(),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'peer_id': peerId,
      'peer_alias': peerAlias,
      'connection_id': connectionId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  List<Object?> get props => [id, peerId, peerAlias, connectionId, createdAt];
}
