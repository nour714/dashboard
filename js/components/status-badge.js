/**
 * AfriciaTravel — Reusable Status Badge Component
 */

export function renderStatusBadge(status) {
  if (!status) return '';
  const s = String(status).toUpperCase();

  let badgeClass = 'badge-neutral';
  let label = s;

  switch (s) {
    case 'PAID':
    case 'PAID IN FULL':
      badgeClass = 'badge-paid';
      label = 'PAID';
      break;
    case 'PARTIALLY PAID':
      badgeClass = 'badge-partially-paid';
      label = 'PARTIALLY PAID';
      break;
    case 'PENDING':
    case 'PENDING PAY':
      badgeClass = 'badge-pending-pay';
      label = 'PENDING PAY';
      break;
    case 'CONFIRMED':
    case 'ISSUED':
      badgeClass = 'badge-confirmed';
      label = s === 'ISSUED' ? 'ISSUED' : 'CONFIRMED';
      break;
    case 'MODIFIED':
      badgeClass = 'badge-modified';
      label = 'MODIFIED';
      break;
    case 'REFUND REQUESTED':
      badgeClass = 'badge-refund-requested';
      label = 'REFUND REQUESTED';
      break;
    case 'REFUNDED':
      badgeClass = 'badge-refunded';
      label = 'REFUNDED';
      break;
    case 'CANCELLED':
      badgeClass = 'badge-cancelled';
      label = 'CANCELLED';
      break;
    case 'COMPLETED':
      badgeClass = 'badge-completed';
      label = 'COMPLETED';
      break;
    case 'PROCESSING':
      badgeClass = 'badge-processing';
      label = 'PROCESSING';
      break;
    case 'REJECTED':
      badgeClass = 'badge-rejected';
      label = 'REJECTED';
      break;
    case 'ACTIVE':
      badgeClass = 'badge-active';
      label = 'ACTIVE';
      break;
    case 'AWAY':
      badgeClass = 'badge-away';
      label = 'AWAY';
      break;
    case 'SCHEDULED':
      badgeClass = 'badge-scheduled';
      label = 'SCHEDULED';
      break;
    case 'DELAYED':
      badgeClass = 'badge-delayed';
      label = 'DELAYED';
      break;
    case 'FLOWN':
      badgeClass = 'badge-flown';
      label = 'FLOWN';
      break;
    case 'ADMIN':
      badgeClass = 'badge-admin';
      label = 'ADMIN';
      break;
    case 'AGENT':
      badgeClass = 'badge-agent';
      label = 'AGENT';
      break;
    case 'VIP':
      badgeClass = 'badge-vip';
      label = 'VIP';
      break;
  }

  return `<span class="badge ${badgeClass}"><span class="badge-dot"></span>${label}</span>`;
}
