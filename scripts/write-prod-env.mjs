/**
 * En Render: API_BASE_URL=https://TU-API.onrender.com/api
 * En local: no se define → no toca environment.prod.ts
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const api = (process.env.API_BASE_URL || '').trim();
if (!api) {
  console.log('[write-prod-env] API_BASE_URL vacío: se usa environment.prod.ts tal cual.');
  process.exit(0);
}

const culqi = process.env.CULQI_PUBLIC_KEY || 'pk_test_tu_clave_publica';
const google = process.env.GOOGLE_CLIENT_ID || '';
const wa = (process.env.WHATSAPP_NUMBER || '51916464315').replace(/\D/g, '');
const dir = dirname(fileURLToPath(import.meta.url));
const dest = join(dir, '../src/environments/environment.prod.ts');

const body = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(api)},
  culqiPublicKey: ${JSON.stringify(culqi)},
  googleClientId: ${JSON.stringify(google)},
  whatsappNumber: ${JSON.stringify(wa)},
  realtime: {
    driver: 'poll' as 'poll' | 'sse' | 'pusher',
    intervalMs: 12000,
  },
};
`;

writeFileSync(dest, body);
console.log('[write-prod-env] apiBaseUrl =', api);
if (!existsSync(dest)) {
  console.error('[write-prod-env] no se escribió el archivo');
  process.exit(1);
}
