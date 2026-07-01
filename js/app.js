import { eventBus } from './utils/events.js';
import { initRouter } from './ui/router.js';
import { initTheme } from './ui/theme.js';
import { initSidebar } from './ui/sidebar.js';
import { showToast } from './ui/toast.js';

function boot() {
  initTheme();
  initSidebar();
  initRouter();

  eventBus.once('route:change', ({ route }) => {
    showToast(`Loaded ${route.slice(1)} view`, 'success');
  });

  window.__taskGroup1 = {
    eventBus,
    showToast,
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
