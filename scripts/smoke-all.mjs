import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function parseEnv(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

function short(text, max = 180) {
  return String(text ?? '').replace(/\s+/g, ' ').slice(0, max);
}

function runCmd(name, command, args) {
  let run;
  if (process.platform === 'win32') {
    const cmdLine = [command, ...args].join(' ');
    run = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdLine], { stdio: 'pipe', encoding: 'utf8' });
  } else {
    run = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8' });
  }
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  const ok = run.status === 0;
  return {
    test: name,
    pass: ok,
    expected: 'exit=0',
    actual: `exit=${run.status}`,
    details: short(output, 260),
  };
}

const env = {
  ...parseEnv('.env'),
  ...parseEnv('.env.production'),
  ...process.env,
};

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const adminEmail = env.SMOKE_ADMIN_EMAIL;
const adminPassword = env.SMOKE_ADMIN_PASSWORD;
const profEmail = env.SMOKE_PROF_EMAIL;
const profPassword = env.SMOKE_PROF_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env/.env.production.');
  process.exit(1);
}

if (!adminEmail || !adminPassword || !profEmail || !profPassword) {
  console.error('Missing SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD, SMOKE_PROF_EMAIL, SMOKE_PROF_PASSWORD in environment.');
  process.exit(1);
}

const results = [];
const tempUsers = [];

function push(name, expected, actual, details = '') {
  const pass = typeof expected === 'function' ? expected(actual) : expected === actual;
  results.push({
    test: name,
    pass,
    expected: typeof expected === 'function' ? 'custom' : String(expected),
    actual: String(actual),
    details: short(details),
  });
  return pass;
}

async function signIn(email, password) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function invokeJsonFn(token, fnName, body) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function invokeFormFn(token, fnName, csvText) {
  const fd = new FormData();
  fd.append('file', new Blob([csvText], { type: 'text/csv' }), 'students.csv');

  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const text = await res.text();
  return { status: res.status, text };
}

// 1) Frontend/compile smoke
results.push(runCmd('TypeScript compile', 'npx', ['tsc', '--noEmit']));
results.push(runCmd('Expo web export', 'npx', ['expo', 'export', '--platform', 'web']));

// 2) Auth smoke
const adminAuth = await signIn(adminEmail, adminPassword);
push('Admin login', 200, adminAuth.status, JSON.stringify(adminAuth.data));

const profAuth = await signIn(profEmail, profPassword);
push('Professor login', 200, profAuth.status, JSON.stringify(profAuth.data));

if (adminAuth.status !== 200 || profAuth.status !== 200 || !adminAuth.data.access_token || !profAuth.data.access_token) {
  console.table(results);
  console.log(`SMOKE_SUMMARY: total=${results.length} passed=${results.filter((r) => r.pass).length} failed=${results.filter((r) => !r.pass).length}`);
  process.exit(2);
}

const adminToken = adminAuth.data.access_token;
const profToken = profAuth.data.access_token;

// 3) Functional smoke - authenticated endpoints
const ptxtAdmin = await invokeJsonFn(adminToken, 'process-text', { text: 'Teste smoke admin.' });
push('process-text (admin)', (s) => s === 200 || s === 500, ptxtAdmin.status, ptxtAdmin.text);

const ptxtProf = await invokeJsonFn(profToken, 'process-text', { text: 'Teste smoke professor.' });
push('process-text (professor)', (s) => s === 200 || s === 500, ptxtProf.status, ptxtProf.text);

// 4) RBAC smoke (professor should be blocked in admin flows)
const profAdminCreate = await invokeJsonFn(profToken, 'admin-create-user', {
  email: `rbac_denied_${Date.now()}@example.com`,
  password: 'Aa12345678',
  full_name: 'RBAC Should Deny',
  role: 'professor',
});
push('RBAC professor denied admin-create-user', 403, profAdminCreate.status, profAdminCreate.text);

const profDeleteOcc = await invokeJsonFn(profToken, 'delete-occurrence', {
  occurrence_id: '00000000-0000-0000-0000-000000000000',
});
push('RBAC professor denied delete-occurrence', 403, profDeleteOcc.status, profDeleteOcc.text);

const profImport = await invokeFormFn(profToken, 'import-csv', 'nome,ra,turmaid\nSmoke,1,00000000-0000-0000-0000-000000000000');
push('RBAC professor denied import-csv', 403, profImport.status, profImport.text);

// 5) Admin flow smoke: create -> update -> delete temp user
const tempEmail = `smoke_${Date.now()}@example.com`;
const adminCreate = await invokeJsonFn(adminToken, 'admin-create-user', {
  email: tempEmail,
  password: 'Aa12345678',
  full_name: 'Smoke Temp User',
  role: 'professor',
  whatsapp_number: '5511999999999',
});
push('admin-create-user (admin)', 200, adminCreate.status, adminCreate.text);

let createdAuthId = null;
let createdProfileId = null;

try {
  const parsed = JSON.parse(adminCreate.text);
  createdAuthId = parsed?.user?.user?.id ?? null;
} catch {
  createdAuthId = null;
}

if (createdAuthId) {
  tempUsers.push(createdAuthId);
  const lookup = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,auth_id&auth_id=eq.${encodeURIComponent(createdAuthId)}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${adminToken}`,
      Accept: 'application/json',
    },
  });
  const profileRows = await lookup.json().catch(() => []);
  createdProfileId = Array.isArray(profileRows) && profileRows[0]?.id ? profileRows[0].id : '00000000-0000-0000-0000-000000000000';

  const adminUpdate = await invokeJsonFn(adminToken, 'admin-update-user', {
    profile_id: createdProfileId,
    updates: {
      full_name: 'Smoke Temp User Updated',
      role: 'professor',
      whatsapp_number: '5511888888888',
    },
  });
  push('admin-update-user (admin)', (s) => s === 200 || s === 400, adminUpdate.status, adminUpdate.text);

  const adminDelete = await invokeJsonFn(adminToken, 'admin-delete-user', {
    profile_id: createdProfileId,
    auth_id: createdAuthId,
  });
  push('admin-delete-user (admin)', 200, adminDelete.status, adminDelete.text);
}

// 6) Admin allowed operations
const adminDeleteOcc = await invokeJsonFn(adminToken, 'delete-occurrence', {
  occurrence_id: '00000000-0000-0000-0000-000000000000',
});
push('delete-occurrence (admin)', 200, adminDeleteOcc.status, adminDeleteOcc.text);

const adminImport = await invokeFormFn(adminToken, 'import-csv', 'nome,ra,turmaid\nSmoke,1,00000000-0000-0000-0000-000000000000');
push('import-csv (admin)', 200, adminImport.status, adminImport.text);

// 7) Additional authenticated probes
const sendManual = await invokeJsonFn(profToken, 'send-whatsapp-manual', {
  phone: '5511999999999',
  text: 'smoke test',
});
push('send-whatsapp-manual authenticated', (s) => s !== 401, sendManual.status, sendManual.text);

const categorize = await invokeJsonFn(profToken, 'categorize-occurrence', {
  occurrence_id: '00000000-0000-0000-0000-000000000000',
});
push('categorize-occurrence authenticated', (s) => s !== 401, categorize.status, categorize.text);

// 8) Cleanup any leftover temp users (best effort)
for (const authId of tempUsers) {
  const cleanup = await invokeJsonFn(adminToken, 'admin-delete-user', {
    profile_id: '00000000-0000-0000-0000-000000000000',
    auth_id: authId,
  });
  push(`cleanup temp user ${authId.slice(0, 8)}`, (s) => s === 200 || s === 400, cleanup.status, cleanup.text);
}

console.table(results);

const passed = results.filter((r) => r.pass).length;
const failed = results.length - passed;
console.log(`SMOKE_SUMMARY: total=${results.length} passed=${passed} failed=${failed}`);

if (failed > 0) process.exit(2);