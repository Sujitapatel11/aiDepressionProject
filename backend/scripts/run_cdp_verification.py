import os
import sys
import json
import base64
import time
import urllib.request
import django

# Setup Django
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

# Get User 4 Token
user4 = User.objects.get(id=4)
refresh = RefreshToken.for_user(user4)
access_token = str(refresh.access_token)
refresh_token = str(refresh)

print(f"Generated JWT for User ID {user4.id} ({user4.username}): Access Token length = {len(access_token)}")

# Update CDP Automation script with valid token
js_script = f"""import http from 'http';

async function getWsUrl() {{
  return new Promise((resolve, reject) => {{
    http.get('http://127.0.0.1:9222/json', (res) => {{
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {{
        try {{
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page');
          if (page && page.webSocketDebuggerUrl) {{
            resolve(page.webSocketDebuggerUrl);
          }} else {{
            reject(new Error('No page target found'));
          }}
        }} catch (e) {{
          reject(e);
        }}
      }});
    }}).on('error', reject);
  }});
}}

async function run() {{
  const wsUrl = await getWsUrl();
  console.log('Connecting to CDP at:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const callbacks = new Map();

  function send(method, params = {{}}) {{
    return new Promise((resolve) => {{
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({{ id, method, params }}));
    }});
  }}

  const networkRequests = new Map();
  const consoleLogs = [];

  ws.addEventListener('open', async () => {{
    console.log('WebSocket CDP connection opened successfully.');

    await send('Network.enable');
    await send('Console.enable');
    await send('Page.enable');
    await send('Runtime.enable');

    // First navigate to app domain so localStorage is available for http://localhost:5173
    await send('Page.navigate', {{ url: 'http://localhost:5173/' }});
    await new Promise(r => setTimeout(r, 1500));

    // Set localStorage auth keys in browser context
    const setStorageScript = `
      (() => {{
        localStorage.setItem('sc_token', '{access_token}');
        localStorage.setItem('sc_refresh', '{refresh_token}');
        localStorage.setItem('sc_uid', '4');
        localStorage.setItem('sc_username', 'Sujita Patel');
        localStorage.setItem('soulcare_token', '{access_token}');
        localStorage.setItem('soulcare_refresh', '{refresh_token}');
        localStorage.setItem('soulcare_user_id', '4');
        localStorage.setItem('soulcare_username', 'Sujita Patel');
        return 'STORAGE_SET_SUCCESS';
      }})();
    `;

    const setRes = await send('Runtime.evaluate', {{ expression: setStorageScript, returnByValue: true }});
    console.log('Set LocalStorage Status:', setRes?.result?.value);

    // Now reload/navigate to http://localhost:5173/journal
    console.log('Navigating to http://localhost:5173/journal with valid token in localStorage...');
    await send('Page.navigate', {{ url: 'http://localhost:5173/journal' }});
    await new Promise(r => setTimeout(r, 4000));

    // Check state on /journal
    const checkState = `
      (() => {{
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, p, div')).map(e => e.innerText);
        return {{
          url: window.location.href,
          sc_token: localStorage.getItem('sc_token') ? 'PRESENT' : 'NULL',
          sc_uid: localStorage.getItem('sc_uid'),
          renderedEntriesCount: document.querySelectorAll('.space-y-4 > div').length
        }};
      }})();
    `;
    const stateRes = await send('Runtime.evaluate', {{ expression: checkState, returnByValue: true }});
    console.log('\\n--- BROWSER RENDERED STATE ON /JOURNAL ---');
    console.log(JSON.stringify(stateRes?.result?.value, null, 2));

    // Print summary report
    console.log('\\n' + '='.repeat(80));
    console.log('REAL BROWSER VERIFICATION REPORT AFTER VITE PROXY FIX');
    console.log('='.repeat(80));

    console.log('\\n[1] BROWSER CONSOLE MESSAGES & ERRORS:');
    if (consoleLogs.length === 0) {{
      console.log('None captured.');
    }} else {{
      consoleLogs.forEach(c => console.log(`  [${{c.type || 'LOG'}}] ${{c.text || JSON.stringify(c)}}`));
    }}

    console.log('\\n[2] BROWSER NETWORK REQUESTS & RESPONSES:');
    for (const [requestId, req] of networkRequests.entries()) {{
      if (req.url.includes('/api/')) {{
        console.log(`\\n--------------------------------------------------`);
        console.log(`URL: ${{req.url}}`);
        console.log(`Method: ${{req.method}}`);
        console.log(`HTTP Status Code: ${{req.status !== undefined ? req.status : 'NO RESPONSE / FAILED'}}`);

        if (req.failed) {{
          console.log(`Browser Failure Message: ${{req.errorText}}`);
        }}
        if (req.body) {{
          console.log(`Response Payload Snippet:\\n${{req.body.slice(0, 600)}}`);
        }}
      }}
    }}

    console.log('\\n' + '='.repeat(80));
    ws.close();
    process.exit(0);
  }});

  ws.addEventListener('message', async (event) => {{
    const msg = JSON.parse(event.data);

    if (msg.id && callbacks.has(msg.id)) {{
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }}

    if (msg.method === 'Console.messageAdded') {{
      consoleLogs.push(msg.params.message);
    }}
    if (msg.method === 'Runtime.consoleAPICalled') {{
      const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push({{ type: msg.params.type, text: args }});
    }}

    if (msg.method === 'Network.requestWillBeSent') {{
      const {{ requestId, request }} = msg.params;
      networkRequests.set(requestId, {{
        url: request.url,
        method: request.method,
        headers: request.headers,
      }});
    }}

    if (msg.method === 'Network.responseReceived') {{
      const {{ requestId, response }} = msg.params;
      if (networkRequests.has(requestId)) {{
        const req = networkRequests.get(requestId);
        req.status = response.status;
        req.statusText = response.statusText;
        req.mimeType = response.mimeType;

        try {{
          const bodyRes = await send('Network.getResponseBody', {{ requestId }});
          if (bodyRes && bodyRes.body) {{
            req.body = bodyRes.body;
          }}
        }} catch (e) {{}}
      }}
    }}

    if (msg.method === 'Network.loadingFailed') {{
      const {{ requestId, errorText, canceled }} = msg.params;
      if (networkRequests.has(requestId)) {{
        const req = networkRequests.get(requestId);
        req.failed = true;
        req.errorText = errorText;
        req.canceled = canceled;
      }}
    }}
  }});

  ws.addEventListener('error', (err) => {{
    console.error('WebSocket Error:', err);
  }});
}}

run().catch(console.error);
"""

with open(os.path.join(backend_dir, 'scripts', 'cdp_browser_automation.js'), 'w', encoding='utf-8') as f:
    f.write(js_script)

print("Updated cdp_browser_automation.js with live JWT token.")
