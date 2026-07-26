import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/community/domain/entities/peer_user_entity.dart';
import 'package:aiDepressionProject/features/community/presentation/widgets/peer_user_card.dart';

void main() {
  testWidgets('PeerUserCard renders username and match score badge', (tester) async {
    const peer = PeerUserEntity(
      id: 1,
      username: 'Taylor_Mindful',
      matchScore: 94,
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: PeerUserCard(peer: peer),
        ),
      ),
    );

    expect(find.text('Taylor_Mindful'), findsOneWidget);
    expect(find.text('94% Match'), findsOneWidget);
    expect(find.text('Connect'), findsOneWidget);
  });
}
