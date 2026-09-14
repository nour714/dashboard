// Runs before the application module to prevent language/direction layout shift.
try {
  const stored = localStorage.getItem('africatravel.language');
  const lang = stored || (navigator.language?.startsWith('ar') ? 'ar' : 'en');
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (localStorage.getItem('africatravel.sidebarCollapsed') === '1') {
    document.documentElement.classList.add('sidebar-collapsed');
  }

  // Theme: manual override priority, otherwise respect OS prefers-color-scheme
  const storedTheme = localStorage.getItem('africatravel.theme');
  const theme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch (_) {
  // Storage can be disabled; the static HTML defaults remain usable.
}
