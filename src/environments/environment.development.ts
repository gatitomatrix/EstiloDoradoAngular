export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  culqiPublicKey: 'pk_test_tu_clave_publica',
  googleClientId: '',
  realtime: {
    driver: 'poll' as 'poll' | 'sse' | 'pusher',
    intervalMs: 12000,
  },
};
