// Runs before the application module to prevent language/direction layout shift.
try {
  const stored = localStorage.getItem('africatravel.language');
  const lang = stored || (navigator.language?.startsWith('ar') ? 'ar' : 'en');
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (localStorage.getItem('africatravel.sidebarCollapsed') === '1') {
    document.documentElement.classList.add('sidebar-collapsed');
  }
} catch (_) {
  // Storage can be disabled; the static HTML defaults remain usable.
}
