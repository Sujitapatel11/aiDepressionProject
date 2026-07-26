import 'package:flutter/material.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/datasources/journal_remote_datasource.dart';
import '../../data/models/journal_model.dart';

class JournalController extends ChangeNotifier {
  final JournalRemoteDataSource dataSource;
  final SecureStorageService storageService;

  JournalController({
    required this.dataSource,
    required this.storageService,
  });

  List<JournalModel> _journals = [];
  List<JournalModel> get journals => _journals;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  Future<void> loadJournals() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        _journals = await dataSource.fetchJournals(token);
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createEntry({
    required String title,
    required String content,
    required String mood,
    required int moodIntensity,
    required List<String> tags,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        final newEntry = await dataSource.createJournal(
          token: token,
          title: title,
          content: content,
          mood: mood,
          moodIntensity: moodIntensity,
          tags: tags,
        );
        _journals.insert(0, newEntry);
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _errorMessage = "Failed to create entry";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
