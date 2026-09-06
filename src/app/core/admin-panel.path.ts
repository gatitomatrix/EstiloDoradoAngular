/** Ruta secreta del panel (no es /admin). El API sigue en /api/admin. */
export const ADMIN_PANEL_PATH = 'panel-ed-k7m2';

export function isAdminPanelUrl(url: string): boolean {
  const p = (url.split('?')[0] || '').toLowerCase();
  return p === `/${ADMIN_PANEL_PATH}` || p.startsWith(`/${ADMIN_PANEL_PATH}/`);
}
