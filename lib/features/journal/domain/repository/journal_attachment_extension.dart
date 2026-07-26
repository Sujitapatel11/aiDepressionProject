import 'entities/journal_failure.dart';

/// Extension contract preparing future media attachment uploads (images, audio, documents)
abstract class JournalAttachmentExtension {
  /// Prepares image attachment upload
  Future<({String? attachmentUrl, JournalFailure? failure})> uploadImageAttachment(List<int> imageBytes);

  /// Prepares audio attachment upload
  Future<({String? attachmentUrl, JournalFailure? failure})> uploadAudioAttachment(List<int> audioBytes);

  /// Prepares document attachment upload
  Future<({String? attachmentUrl, JournalFailure? failure})> uploadDocumentAttachment(List<int> docBytes);
}
