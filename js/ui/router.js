import { eventBus } from '../utils/events.js';

const DEFAULT_ROUTE = '/dashboard';
const ALLOWED_ROUTES = new Set(['/dashboard', '/receipts', '/settings']);

function normalizeHash(hash) {
  const route = `/${String(hash || '').replace(/^#?\/+/, '').toLowerCase()}`;
  return ALLOWED_ROUTES.has(route) ? route : DEFAULT_ROUTE;
}

export function getCurrentRoute() {
  return normalizeHash(window.location.hash);
}

export function navigateTo(route) {
  const target = normalizeHash(route);
  const hash = `#${target}`;
  if (window.location.hash === hash) {
    eventBus.emit('route:change', { route: target });
    return;
  }
  window.location.hash = hash;
}

export function initRouter() {
  const emitRoute = () => {
    const route = getCurrentRoute();
    eventBus.emit('route:change', { route });
    eventBus.emit('view:change', { view: route.slice(1) });
  };

  if (!window.location.hash) {
    window.location.hash = `#${DEFAULT_ROUTE}`;
  }

  window.addEventListener('hashchange', emitRoute);
  emitRoute();

  return () => window.removeEventListener('hashchange', emitRoute);
}
