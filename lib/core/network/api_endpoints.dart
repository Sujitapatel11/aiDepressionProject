/// Existing Django REST Framework Backend API & WebSocket Endpoints
class ApiEndpoints {
  // Auth
  static const String login = "/api/auth/login/";
  static const String signup = "/api/auth/signup/";
  static const String googleAuth = "/api/auth/google/";
  static const String passwordReset = "/api/auth/password/reset/";
  static const String tokenRefresh = "/api/auth/token/refresh/";
  static const String logout = "/api/auth/logout/";

  // Dashboard
  static const String dashboard = "/api/dashboard/";

  // Journal
  static const String journalListCreate = "/api/journal/";
  static String journalDetail(int id) => "/api/journal/$id/";

  // Insights
  static const String insightsList = "/api/insights/";
  static String dismissInsight(int id) => "/api/insights/dismiss/$id/";
  static String generateInsight(int journalId) => "/api/insights/generate/$journalId/";

  // Peer Support & Connections
  static const String availableUsers = "/api/support/users/";
  static const String incomingRequests = "/api/support/requests/";
  static const String sentRequests = "/api/support/requests/sent/";
  static String sendRequest(int userId) => "/api/support/send/$userId/";
  static String acceptRequest(int reqId) => "/api/support/accept/$reqId/";
  static String rejectRequest(int reqId) => "/api/support/reject/$reqId/";
  static const String activeConnections = "/api/support/connections/";
  static String blockConnection(String connId) => "/api/support/connections/$connId/block/";
  static String disconnectConnection(String connId) => "/api/support/connections/$connId/disconnect/";
  static const String myPersonality = "/api/support/personality/";

  // Chat & WebSockets
  static String messageHistory(String connId) => "/api/chat/$connId/messages/";
  static String wsChat(String connId) => "/ws/chat/$connId/";
}

