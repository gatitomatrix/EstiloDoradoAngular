export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api',
  culqiPublicKey: 'pk_test_vJYOwLgj0Zghy6SF',
  /** Client ID OAuth de Google (Web). Vacío = demo local en /auth/google */
  whatsappNumber: '51916464315',
  googleClientId: '777778875504-2v87ku2g09ihl0na65ge110hmqm6r2nh.apps.googleusercontent.com',
  /**
   * Transporte de avisos del admin.
   * poll = local y Render (sin extra). Luego: 'sse' o 'pusher' sin cambiar la UI.
   */
  realtime: {
    driver: 'poll' as 'poll' | 'sse' | 'pusher',
    intervalMs: 12000,
  },
};
