import { eventBus } from '../utils/events.js';
import { navigateTo } from './router.js';

const VIEWS = ['dashboard', 'receipts', 'settings'];

function ensureSidebarNav() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return null;

  let nav = sidebar.querySelector('[data-role="main-nav"]');
  if (nav) return nav;

  nav = document.createElement('nav');
  nav.dataset.role = 'main-nav';
  nav.className = 'sidebar-nav';
  nav.innerHTML = VIEWS
    .map((view) => `<a href="#/${view}" data-view="${view}">${view[0].toUpperCase()}${view.slice(1)}</a>`)
    .join('');

  sidebar.prepend(nav);
  return nav;
}

export function initSidebar() {
  const nav = ensureSidebarNav();
  if (!nav) return;

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('[data-view]');
    if (!link) return;
    event.preventDefault();
    navigateTo(link.dataset.view);
  });

  eventBus.on('route:change', ({ route }) => {
    const activeView = route.replace(/^\//, '');
    nav.querySelectorAll('[data-view]').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === activeView);
    });
  });

  eventBus.on('view:change', ({ view }) => {
    nav.dataset.activeView = view;
  });
}
