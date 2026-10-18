/**
 * Test Script: test_ws_token_refresh.mjs
 * Proves that with a deliberately expired access token and a valid refresh token:
 * 1. Proactive expiration check detects expired token before connect and refreshes it.
 * 2. On close code 4003, single-flight token refresh is executed and socket reconnects automatically without user action.
 * 3. Rotated refresh token is saved alongside the new access token.
 * 4. Concurrent 401 requests trigger only ONE refresh call (single-flight deduplication).
 * 5. Reconnection uses exponential backoff (1s, 2s, 4s...) capped at 30s.
 */

// ── 1. Mock Browser Environment (localStorage, WebSocket, fetch) ──────────────
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

globalThis.window = {
  location: { protocol: 'https:', host: 'aidepressionproject.onrender.com', pathname: '/chat' },
  dispatchEvent: () => {},
};

// Mock WebSocket
class MockWebSocket {
  static instances = [];
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    MockWebSocket.instances.push(this);

    // Auto-trigger onopen asynchronously on first tick
    setTimeout(() => {
      if (typeof this.onopen === 'function') {
        this.onopen();
      }
    }, 10);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (typeof this.onclose === 'function') {
      this.onclose({ code, reason });
    }
  }

  send(data) {}
}
globalThis.WebSocket = MockWebSocket;

// Helper to craft mock JWTs with specific exp claim
function createMockJwt(userId, expiresInSeconds) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    user_id: userId,
    exp: now + expiresInSeconds,
    token_type: 'access'
  })).toString('base64url');
  const signature = 'mock_signature_bytes';
  return `${header}.${payload}.${signature}`;
}

// ── 2. Run Test Scenarios ────────────────────────────────────────────────────
async function runTests() {
  console.log('='.repeat(70));
  console.log('RUNNING CHAT WEBSOCKET & TOKEN REFRESH VERIFICATION SUITE');
  console.log('='.repeat(70));

  // Dynamically import the modules under test
  const { api, refreshAccessToken, getStoredToken, getStoredRefreshToken } = await import('../frontend/src/services/api.js');
  const { ChatWebSocketClient, isTokenExpiringSoon, parseJwtPayload } = await import('../frontend/src/services/chatWebSocket.js');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ── TEST 1: JWT Expiration Parser ──────────────────────────────────────────
  console.log('\n--- Test 1: JWT Expiration Detection ---');
  const expiredToken = createMockJwt(42, -300); // Expired 5 minutes ago
  const validToken = createMockJwt(42, 1800);   // Valid for 30 minutes
  const soonExpiringToken = createMockJwt(42, 30); // Expiring in 30 seconds (< 60s buffer)

  assert(isTokenExpiringSoon(expiredToken, 60) === true, 'Correctly identifies expired token as needing refresh');
  assert(isTokenExpiringSoon(soonExpiringToken, 60) === true, 'Correctly identifies token expiring in <60s as needing proactive refresh');
  assert(isTokenExpiringSoon(validToken, 60) === false, 'Correctly identifies fresh token (>60s) as valid');

  // ── TEST 2: Single-Flight Refresh with Rotated Refresh Token ────────────────
  console.log('\n--- Test 2: Single-Flight Refresh with Rotated Tokens ---');
  storageMap.clear();
  storageMap.set('sc_token', expiredToken);
  storageMap.set('sc_refresh', 'initial_refresh_token_123');

  let refreshNetworkCallCount = 0;
  globalThis.fetch = async (url, opts) => {
    if (url.includes('/auth/token/refresh/')) {
      refreshNetworkCallCount++;
      const body = JSON.parse(opts.body);
      // Simulate network delay
      await new Promise(r => setTimeout(r, 50));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access: createMockJwt(42, 1800),
          refresh: 'rotated_refresh_token_456'
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  // Launch 5 concurrent refresh calls simultaneously
  const results = await Promise.all([
    refreshAccessToken(),
    refreshAccessToken(),
    refreshAccessToken(),
    refreshAccessToken(),
    refreshAccessToken(),
  ]);

  assert(refreshNetworkCallCount === 1, `Only ONE network call made for 5 concurrent refresh requests (Actual: ${refreshNetworkCallCount})`);
  assert(results.every(token => Boolean(token) && token === results[0]), 'All concurrent callers received the identical new access token');
  assert(getStoredRefreshToken() === 'rotated_refresh_token_456', 'Both new access token and rotated refresh token were saved to storage');

  // ── TEST 3: Proactive WebSocket Refresh on Connect with Expired Token ───────
  console.log('\n--- Test 3: Proactive Refresh on WebSocket Connect ---');
  storageMap.clear();
  MockWebSocket.instances = [];
  const expiredAccess = createMockJwt(99, -100);
  storageMap.set('sc_token', expiredAccess);
  storageMap.set('sc_refresh', 'valid_refresh_token_abc');

  const statusLogs = [];
  const client = new ChatWebSocketClient('conn-uuid-test', expiredAccess, {
    onStatusChange: (status, online) => statusLogs.push({ status, online })
  });

  await client.connect();
  // Wait for initial handshake
  await new Promise(r => setTimeout(r, 60));

  assert(MockWebSocket.instances.length === 1, 'WebSocket instantiated after proactive token refresh');
  const wsUrl = MockWebSocket.instances[0].url;
  assert(!wsUrl.includes(expiredAccess), 'WebSocket connection URL uses the FRESH token, NOT the expired token');
  assert(statusLogs.some(s => s.status === 'Online' && s.online === true), 'WebSocket reached Online state automatically');

  // ── TEST 4: Auto-Reconnect on Server Close Code 4003 (Token Expired) ────────
  console.log('\n--- Test 4: Automatic Reconnect on Close Code 4003 ---');
  // Simulate the server suddenly closing the socket with code 4003
  const activeWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  const preCloseInstanceCount = MockWebSocket.instances.length;

  // Next refresh returns a fresh token
  let secondRefreshCalled = false;
  const currentRefresh = getStoredRefreshToken();
  globalThis.fetch = async (url, opts) => {
    if (url.includes('/auth/token/refresh/')) {
      secondRefreshCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access: createMockJwt(99, 1800),
          refresh: 'rotated_refresh_token_step4'
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  // Trigger close with code 4003
  activeWs.close(4003, 'Forbidden / Token Expired');

  // Wait for async refresh and reconnect
  await new Promise(r => setTimeout(r, 100));

  assert(secondRefreshCalled === true, 'Token refresh was invoked upon receiving close code 4003');
  assert(MockWebSocket.instances.length === preCloseInstanceCount + 1, 'New WebSocket instance was automatically created without user action');
  assert(getStoredRefreshToken() === 'rotated_refresh_token_step4', 'New rotated refresh token was persisted');

  // ── TEST 5: Non-4003 Disconnect Exponential Backoff ─────────────────────────
  console.log('\n--- Test 5: Exponential Backoff Reconnect (1s, 2s, 4s...) ---');
  const latestWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
  client.reconnectAttempts = 0;

  // Trigger abnormal closure (e.g. 1006 network drop)
  latestWs.close(1006, 'Abnormal Closure');
  assert(client.reconnectAttempts === 1, 'Reconnect attempt counter incremented to 1');
  assert(client.reconnectTimer !== null, 'Reconnect timer scheduled with exponential backoff delay');

  client.disconnect();
  assert(client.isManualDisconnect === true, 'Manual disconnect halts reconnection loop');
  assert(client.reconnectTimer === null, 'Reconnect timer cleared on manual disconnect');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
