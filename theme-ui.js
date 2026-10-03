(() => {
  // Keep previously shared shop links useful without retaining a mixed catalog.
  const route = location.pathname.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '');
  if (route === 'shop') {
    const target = location.hash === '#coins' ? 'card-protectors.html'
      : location.hash === '#books' ? 'books.html' : 'apparel.html';
    location.replace(new URL(target + location.search, location.href));
    return;
  }
  const header = document.querySelector('.pl-site-header');
  if (!header) return;
  const menuButton = header.querySelector('.pl-menu-toggle');
  const nav = header.querySelector('.pl-nav');
  const searchButton = header.querySelector('[data-search-toggle]');
  const search = header.querySelector('[data-site-search]');
  const narrowScreen = window.matchMedia('(max-width: 720px)');

  const setMenuOpen = (open, restoreFocus = false) => {
    header.classList.toggle('pl-menu-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    if (restoreFocus) menuButton?.focus();
  };
  const closeSearch = (restoreFocus = false) => {
    if (search) search.hidden = true;
    searchButton?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) searchButton?.focus();
  };

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    setMenuOpen(open);
    if (open) closeSearch();
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  searchButton?.addEventListener('click', () => {
    // The shared shop script controls the search form; keep its ARIA state in sync.
    searchButton.setAttribute('aria-expanded', String(!search?.hidden));
    setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (search && !search.hidden) closeSearch(true);
    if (header.classList.contains('pl-menu-open')) setMenuOpen(false, true);
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) {
      closeSearch();
      setMenuOpen(false);
    }
  });
  narrowScreen.addEventListener('change', () => setMenuOpen(false));

  const currentPage = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
  nav?.querySelectorAll('a').forEach((link) => {
    const destination = new URL(link.href);
    const page = destination.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    const current = page === currentPage && !destination.hash;
    link.classList.toggle('is-current', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    if (currentPage === 'card-protectors' && page === 'apparel') {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'location');
    }
  });
  document.querySelectorAll('[data-pl-year]').forEach((year) => {
    year.textContent = String(new Date().getFullYear());
  });
})();
