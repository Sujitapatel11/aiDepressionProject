process.env.VITE_API_BASE_URL = 'https://aidepressionproject.onrender.com';
process.env.VITE_WS_BASE_URL = '';

const getApiUrl = (path) => {
  const envBase = (process.env.VITE_API_BASE_URL || '/api').trim();
  let base = envBase.replace(/\/+$/, '');

  if (!base || base === '/') {
    base = '/api';
  }

  if (base.startsWith('http') && !base.endsWith('/api') && !base.includes('/api/')) {
    base = `${base}/api`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const getWsHost = () => {
  const envWs = (process.env.VITE_WS_BASE_URL || '').trim();
  if (envWs) {
    return envWs.replace(/\/+$/, '');
  }

  const envApi = (process.env.VITE_API_BASE_URL || '').trim();
  if (envApi.startsWith('http')) {
    try {
      const parsed = new URL(envApi);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${parsed.host}`;
    } catch (e) {}
  }

  return 'ws://localhost:5173';
};

console.log('=' .repeat(80));
console.log('PRODUCTION ENDPOINT RESOLUTION VERIFICATION REPORT');
console.log('=' .repeat(80));

const endpoints = [
  { name: 'Login', path: '/auth/login/', expected: 'https://aidepressionproject.onrender.com/api/auth/login/' },
  { name: 'Signup', path: '/auth/signup/', expected: 'https://aidepressionproject.onrender.com/api/auth/signup/' },
  { name: 'Google Login', path: '/auth/google/', expected: 'https://aidepressionproject.onrender.com/api/auth/google/' },
  { name: 'Password Reset', path: '/auth/password/reset/', expected: 'https://aidepressionproject.onrender.com/api/auth/password/reset/' },
  { name: 'Identity Me', path: '/identity/me/', expected: 'https://aidepressionproject.onrender.com/api/identity/me/' },
  { name: 'Journal', path: '/journal/', expected: 'https://aidepressionproject.onrender.com/api/journal/' },
  { name: 'Dashboard', path: '/dashboard/', expected: 'https://aidepressionproject.onrender.com/api/dashboard/' },
  { name: 'Insights', path: '/insights/', expected: 'https://aidepressionproject.onrender.com/api/insights/' },
  { name: 'Support', path: '/support/connections/', expected: 'https://aidepressionproject.onrender.com/api/support/connections/' },
  { name: 'Chat Messages', path: '/chat/1/messages/', expected: 'https://aidepressionproject.onrender.com/api/chat/1/messages/' },
  { name: 'Feedback', path: '/feedback/', expected: 'https://aidepressionproject.onrender.com/api/feedback/' },
  { name: 'Beta Admin', path: '/dashboard/beta/', expected: 'https://aidepressionproject.onrender.com/api/dashboard/beta/' },
];

let passCount = 0;
endpoints.forEach(ep => {
  const actual = getApiUrl(ep.path);
  const ok = actual === ep.expected;
  if (ok) passCount++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${ep.name.padEnd(16)} -> ${actual}`);
});

const wsHostActual = getWsHost();
const wsExpected = 'wss://aidepressionproject.onrender.com';
const wsOk = wsHostActual === wsExpected;
if (wsOk) passCount++;
console.log(`[${wsOk ? 'PASS' : 'FAIL'}] WebSocket Host    -> ${wsHostActual}/ws/chat/1/?token=...`);

console.log('=' .repeat(80));
console.log(`TOTAL RESULT: ${passCount}/${endpoints.length + 1} ENDPOINTS PASSED DIRECTLY TO RENDER HOST.`);
console.log('=' .repeat(80));

if (passCount !== endpoints.length + 1) {
  process.exit(1);
}
