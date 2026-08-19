export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  culqiPublicKey: 'pk_test_tu_clave_publica',
  googleClientId: '', // pega aquí el Client ID tipo Web (….apps.googleusercontent.com)
  realtime: {
    driver: 'poll' as 'poll' | 'sse' | 'pusher',
    intervalMs: 12000,
  },
};
