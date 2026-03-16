import 'package:equatable/equatable.dart';
import '../models/chat_message.dart';

sealed class ChatState extends Equatable {
  const ChatState();

  @override
  List<Object?> get props => [];
}

final class ChatInitial extends ChatState {
  const ChatInitial();
}

final class ChatConnecting extends ChatState {
  const ChatConnecting();
}

final class ChatConnected extends ChatState {
  final List<ChatMessage> messages;
  final bool isTyping;

  const ChatConnected({required this.messages, this.isTyping = false});

  @override
  List<Object?> get props => [messages, isTyping];
}

final class ChatReconnecting extends ChatState {
  const ChatReconnecting();
}

final class ChatError extends ChatState {
  final String message;

  const ChatError({required this.message});

  @override
  List<Object?> get props => [message];
}
