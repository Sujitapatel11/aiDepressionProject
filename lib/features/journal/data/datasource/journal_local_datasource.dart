import 'dart:convert';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/journal_draft_entity.dart';
import '../dto/journal_entry_dto.dart';

/// Local Data Source handling offline timeline caching and local draft recovery
class JournalLocalDataSource {
  final SecureStorageService secureStorage;

  static const String _keyCachedJournals = 'KEY_CACHED_JOURNALS';
  static const String _keyJournalDraft = 'KEY_JOURNAL_DRAFT';

  JournalLocalDataSource({required this.secureStorage});

  /// Caches journal timeline entries locally
  Future<void> cacheJournals(List<JournalEntryDto> entries) async {
    final listJson = entries.map((e) => e.toJson()).toList();
    await secureStorage.write(
      key: _keyCachedJournals,
      value: jsonEncode(listJson),
    );
  }

  /// Retrieves cached journal timeline entries
  Future<List<JournalEntryDto>> getCachedJournals() async {
    final rawJson = await secureStorage.read(key: _keyCachedJournals);
    if (rawJson == null || rawJson.isEmpty) return [];

    try {
      final list = jsonDecode(rawJson) as List;
      return list.map((item) => JournalEntryDto.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Saves unsaved reflection draft locally
  Future<void> saveDraft(JournalDraftEntity draft) async {
    final map = {
      'draftId': draft.draftId,
      'content': draft.content,
      'moodState': draft.moodState,
      'lastSavedAt': draft.lastSavedAt.toIso8601String(),
    };
    await secureStorage.write(
      key: _keyJournalDraft,
      value: jsonEncode(map),
    );
  }

  /// Retrieves stored local draft
  Future<JournalDraftEntity?> getDraft() async {
    final rawJson = await secureStorage.read(key: _keyJournalDraft);
    if (rawJson == null || rawJson.isEmpty) return null;

    try {
      final map = jsonDecode(rawJson) as Map<String, dynamic>;
      final lastSaved = DateTime.tryParse(map['lastSavedAt'].toString()) ?? DateTime.now();
      return JournalDraftEntity(
        draftId: map['draftId'] as String? ?? 'active_draft',
        content: map['content'] as String? ?? '',
        moodState: map['moodState'] as String?,
        lastSavedAt: lastSaved,
      );
    } catch (_) {
      return null;
    }
  }

  /// Clears stored draft
  Future<void> clearDraft() async {
    await secureStorage.delete(key: _keyJournalDraft);
  }
}
