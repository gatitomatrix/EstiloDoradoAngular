export const environment = {
  production: true,
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  culqiPublicKey: 'pk_test_vJYOwLgj0Zghy6SF',
  whatsappNumber: '51916464315',
  googleClientId: '',
  realtime: {
    driver: 'poll' as 'poll' | 'sse' | 'pusher',
    intervalMs: 12000,
  },
};
