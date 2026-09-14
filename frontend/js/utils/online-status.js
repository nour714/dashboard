/**
 * AfricaTravel — Employee Online Presence Utilities
 */

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks if an employee was active within the threshold window (5 minutes)
 * @param {string|Date|null} lastActive
 * @returns {boolean}
 */
export function isEmployeeOnline(lastActive) {
  if (!lastActive) return false;
  const last = new Date(lastActive);
  if (isNaN(last.getTime())) return false;
  return (Date.now() - last.getTime()) < ONLINE_THRESHOLD_MS;
}

/**
 * Formats a user-friendly last seen description in the active language
 * @param {string|Date|null} lastActive
 * @param {Function} t - translation function
 * @returns {string}
 */
export function formatLastSeen(lastActive, t) {
  if (!lastActive) return t('employees.neverLoggedIn') || 'Never logged in';
  const timestamp = new Date(lastActive).getTime();
  if (isNaN(timestamp)) return t('employees.neverLoggedIn') || 'Never logged in';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return t('employees.onlineNow') || 'Online now';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return t('employees.onlineNow') || 'Online now';
  if (diffMin < 60) {
    const unit = t('common.minutesAgo') || 'minutes ago';
    return `${t('employees.lastSeen') || 'Last seen'} ${diffMin} ${unit}`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    const unit = t('common.hoursAgo') || 'hours ago';
    return `${t('employees.lastSeen') || 'Last seen'} ${diffHours} ${unit}`;
  }
  const days = Math.floor(diffHours / 24);
  const unit = t('common.daysAgo') || 'days ago';
  return `${t('employees.lastSeen') || 'Last seen'} ${days} ${unit}`;
}
