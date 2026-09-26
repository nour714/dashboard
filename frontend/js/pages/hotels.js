/**
 * AfricaTravel — Hotel Bookings & AI Voucher Management Page
 */

import { HotelService } from '../services/hotel-service.js';
import { CustomerService } from '../services/customer-service.js';
import { icons } from '../components/icons.js';
import { renderPageHeader } from '../components/page-header.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/security.js';
import { t, i18n } from '../i18n/i18n.js';

let cachedBookings = [];
let currentSearch = '';
let currentGeneratedBooking = null;
let isGenerating = false;
let isSaving = false;

/**
 * Format ISO date for clean display
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate and trigger international printable accommodation voucher
 */
export function printHotelVoucher(booking) {
  if (!booking) return;

  const printWindow = window.open('', '_blank', 'width=920,height=950');
  if (!printWindow) {
    showToast('Please allow popups to download or print the voucher PDF.', 'warning');
    return;
  }

  const checkInFormatted = formatDateDisplay(booking.checkIn);
  const checkOutFormatted = formatDateDisplay(booking.checkOut);
  const issueDateFormatted = formatDateDisplay(booking.createdAt || new Date());
  const starsCount = Math.min(5, Math.max(1, parseInt(booking.hotelStars || 5, 10)));
  const starsHtml = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  // International standard accommodation voucher in English
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accommodation Voucher - ${escapeHtml(booking.bookingReference || 'AFRICATRAVEL')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .voucher-wrapper {
      max-width: 820px;
      margin: 0 auto;
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #b38d4f;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-title span {
      color: #b38d4f;
    }
    .brand-sub {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 600;
    }
    .agency-contact {
      text-align: right;
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }
    .voucher-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .voucher-badge-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #f1f5f9;
    }
    .voucher-status-pill {
      background: #22c55e;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: inline-block;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #b38d4f;
      margin-bottom: 8px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 4px;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .card-label {
      color: #64748b;
      font-weight: 500;
    }
    .card-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .highlight-hotel {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .stars-badge {
      color: #f59e0b;
      font-size: 14px;
      margin-bottom: 6px;
      display: inline-block;
    }
    .highlight-client {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .guarantee-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .guarantee-icon {
      font-size: 20px;
      color: #16a34a;
    }
    .guarantee-text {
      font-size: 11.5px;
      color: #166534;
      font-weight: 600;
      line-height: 1.35;
    }
    .table-details {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .table-details th {
      background: #f1f5f9;
      color: #475569;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      text-transform: uppercase;
    }
    .table-details td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .notes-box {
      background: #f8fafc;
      border-left: 3px solid #b38d4f;
      padding: 10px 14px;
      font-size: 11px;
      color: #475569;
      margin-bottom: 18px;
      line-height: 1.45;
    }
    .footer-table {
      width: 100%;
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
    }
    .stamp-box {
      border: 1px dashed #cbd5e1;
      width: 180px;
      height: 70px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-left: auto;
    }
    .barcode-svg {
      width: 180px;
      height: 36px;
    }
    .print-btn-bar {
      margin-bottom: 16px;
      text-align: right;
    }
    .print-btn {
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      .print-btn-bar {
        display: none !important;
      }
      .voucher-wrapper {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="voucher-wrapper">
    <table class="header-table" role="presentation">
      <tr>
        <td style="vertical-align: middle;">
          <div class="brand-title">Africa<span>Travel</span></div>
          <div class="brand-sub">Travel & Tourism Management System</div>
        </td>
        <td class="agency-contact" style="vertical-align: middle;">
          <strong>AfricaTravel Operations Bureau</strong><br>
          Accredited Travel Service Provider<br>
          Emergency 24/7 Desk: +20 (10) 900-AFRICA<br>
          Email: reservations@africatravel.com
        </td>
      </tr>
    </table>

    <div class="voucher-banner">
      <div>
        <div class="voucher-badge-title">Official Accommodation Voucher</div>
        <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">
          Ref: <strong>${escapeHtml(booking.bookingReference || 'N/A')}</strong> | Conf: <strong>${escapeHtml(booking.confirmationNumber || 'N/A')}</strong>
        </div>
      </div>
      <div>
        <span class="voucher-status-pill">GUARANTEED & CONFIRMED</span>
      </div>
    </div>

    <div class="grid-2">
      <!-- Guest Information -->
      <div class="card">
        <div class="card-title">Guest & Reservation Details</div>
        <div class="card-row" style="margin-bottom: 8px;">
          <div class="card-label">Lead Guest:</div>
          <div class="highlight-client">${escapeHtml(booking.clientName || 'Valued Guest')}</div>
        </div>
        <div class="card-row">
          <span class="card-label">Total Guests:</span>
          <span class="card-value">${escapeHtml(booking.guests || '1 Adult')}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Date Issued:</span>
          <span class="card-value">${escapeHtml(issueDateFormatted)}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Booking Status:</span>
          <span class="card-value" style="color: #16a34a;">CONFIRMED</span>
        </div>
      </div>

      <!-- Hotel Details -->
      <div class="card">
        <div class="card-title">Hotel / Accommodation</div>
        <div class="highlight-hotel">${escapeHtml(booking.hotelName || 'Luxury Hotel')}</div>
        <div class="stars-badge">${starsHtml} (${starsCount}-Star Hotel)</div>
        <div class="card-row">
          <span class="card-label">Destination:</span>
          <span class="card-value">${escapeHtml(booking.city || '')}, ${escapeHtml(booking.country || '')}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Hotel Address:</span>
          <span class="card-value" style="font-size: 11px; max-width: 220px;">${escapeHtml(booking.hotelAddress || 'City Center')}</span>
        </div>
      </div>
    </div>

    <!-- Stay & Room Schedule -->
    <table class="table-details">
      <thead>
        <tr>
          <th>Check-in Date</th>
          <th>Check-out Date</th>
          <th>Stay Duration</th>
          <th>Room Category</th>
          <th>Meal Plan / Board</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(checkInFormatted)}</strong><br><span style="font-size: 10px; color: #64748b;">From 15:00</span></td>
          <td><strong>${escapeHtml(checkOutFormatted)}</strong><br><span style="font-size: 10px; color: #64748b;">Until 12:00</span></td>
          <td><strong>${escapeHtml(String(booking.nights || 1))} Night(s)</strong></td>
          <td><strong>${escapeHtml(booking.roomType || 'Standard Double Room')}</strong></td>
          <td><strong style="color: #0284c7;">${escapeHtml(booking.boardBasis || 'Bed & Breakfast')}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Guarantee & Billing Notice (NO PRICES SHOWN) -->
    <div class="guarantee-box">
      <div class="guarantee-icon">🛡️</div>
      <div class="guarantee-text">
        <strong>BILLING INSTRUCTION & GUARANTEE:</strong> All accommodation charges, room rates, and applicable taxes are <strong>PREPAID & FULLY GUARANTEED</strong> by AfricaTravel. Please extend all contracted courtesy and amenities. <strong>DO NOT COLLECT ANY ACCOMMODATION CHARGES FROM THE GUEST.</strong> (Incidental personal expenses, if any, to be settled directly by guest).
      </div>
    </div>

    <!-- Special Requests & Policies -->
    <div class="notes-box">
      <strong>Voucher Instructions & Check-in Rules:</strong><br>
      • Present this voucher upon check-in along with the guest's passport or official government photo identification.<br>
      • Special requests (${escapeHtml(booking.specialRequests || 'Non-smoking, high floor')}) are confirmed subject to hotel operational availability.<br>
      • Standard international hotel regulations and cancellation policies apply as contracted with AfricaTravel.
    </div>

    <!-- Official Stamp & Barcode -->
    <table class="footer-table" role="presentation">
      <tr>
        <td style="vertical-align: bottom;">
          <svg class="barcode-svg" viewBox="0 0 160 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="3" height="30" fill="#0f172a"/>
            <rect x="5" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="10" y="0" width="5" height="30" fill="#0f172a"/>
            <rect x="18" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="23" y="0" width="4" height="30" fill="#0f172a"/>
            <rect x="30" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="35" y="0" width="6" height="30" fill="#0f172a"/>
            <rect x="44" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="49" y="0" width="4" height="30" fill="#0f172a"/>
            <rect x="56" y="0" width="3" height="30" fill="#0f172a"/>
            <rect x="62" y="0" width="5" height="30" fill="#0f172a"/>
            <rect x="70" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="75" y="0" width="4" height="30" fill="#0f172a"/>
            <rect x="82" y="0" width="3" height="30" fill="#0f172a"/>
            <rect x="88" y="0" width="6" height="30" fill="#0f172a"/>
            <rect x="97" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="102" y="0" width="4" height="30" fill="#0f172a"/>
            <rect x="109" y="0" width="3" height="30" fill="#0f172a"/>
            <rect x="115" y="0" width="5" height="30" fill="#0f172a"/>
            <rect x="123" y="0" width="2" height="30" fill="#0f172a"/>
            <rect x="128" y="0" width="4" height="30" fill="#0f172a"/>
            <rect x="135" y="0" width="6" height="30" fill="#0f172a"/>
            <rect x="144" y="0" width="3" height="30" fill="#0f172a"/>
            <rect x="150" y="0" width="4" height="30" fill="#0f172a"/>
          </svg>
          <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 2px;">
            ${escapeHtml(booking.bookingReference || 'AFRICATRAVEL')}
          </div>
        </td>
        <td style="text-align: right; vertical-align: bottom;">
          <div class="stamp-box">
            <span>OFFICIAL STAMP & SIGNATURE<br><strong>AfricaTravel Operations</strong><br>VERIFIED & ISSUED</span>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Render the full Hotels page
 */
export function renderHotelsPage() {
  const isAr = i18n.getLanguage() === 'ar';

  // Calculate default dates (tomorrow and +3 days)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkout = new Date(tomorrow);
  checkout.setDate(checkout.getDate() + 3);

  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const checkoutStr = checkout.toISOString().slice(0, 10);

  return `
    <div class="page-container page-hotels">
      ${renderPageHeader({
        title: t('hotels.title'),
        subtitle: t('hotels.subtitle'),
        breadcrumbs: [
          { label: t('nav.dashboard'), href: '/dashboard' },
          { label: t('hotels.title') }
        ]
      })}

      <!-- Top AI Generator Card -->
      <div class="card mb-lg" style="border: 1px solid var(--color-border); position: relative; overflow: hidden;">
        <div style="position: absolute; top:0; left:0; right:0; height: 3px; background: linear-gradient(90deg, #b38d4f, #2563eb, #b38d4f);"></div>
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm">
          <div>
            <h3 class="card-title d-flex align-items-center gap-xs">
              <span style="color: #b38d4f;">${icons.sparkles('w-5 h-5')}</span>
              ${escapeHtml(t('hotels.generateTitle'))}
            </h3>
            <p class="text-xs text-muted mt-xxs">${escapeHtml(t('hotels.generateSubtitle'))}</p>
          </div>
          <span class="badge badge-primary">Python Live & AI Powered ✦</span>
        </div>

        <div class="card-body">
          <form id="hotel-ai-form" class="d-flex flex-column gap-md" onsubmit="return false;">
            <div class="form-grid-3">
              <!-- Field 1: Client Name with Autocomplete -->
              <div class="form-group" style="position: relative;">
                <label class="form-label" for="hotel-client-name">
                  ${escapeHtml(t('hotels.clientName'))} *
                </label>
                <div class="input-with-icon">
                  <input
                    type="text"
                    id="hotel-client-name"
                    class="form-control"
                    placeholder="${escapeHtml(t('hotels.clientNamePlaceholder'))}"
                    autocomplete="off"
                    required
                  />
                </div>
                <div id="customer-autocomplete-list" class="autocomplete-dropdown" style="display: none;"></div>
                <input type="hidden" id="hotel-customer-id" value="" />
              </div>

              <!-- Field 2: Country / Destination -->
              <div class="form-group">
                <label class="form-label" for="hotel-destination">
                  ${escapeHtml(t('hotels.destination'))} *
                </label>
                <input
                  type="text"
                  id="hotel-destination"
                  class="form-control"
                  placeholder="${escapeHtml(t('hotels.destinationPlaceholder'))}"
                  required
                />
              </div>

              <!-- Field 3: Dates (Check-in & Check-out) -->
              <div class="form-group">
                <div class="form-grid-2">
                  <div>
                    <label class="form-label" for="hotel-checkin">
                      ${escapeHtml(t('hotels.checkIn'))} *
                    </label>
                    <input
                      type="date"
                      id="hotel-checkin"
                      class="form-control"
                      value="${tomorrowStr}"
                      required
                    />
                  </div>
                  <div>
                    <label class="form-label" for="hotel-checkout">
                      ${escapeHtml(t('hotels.checkOut'))} *
                    </label>
                    <input
                      type="date"
                      id="hotel-checkout"
                      class="form-control"
                      value="${checkoutStr}"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick destination chips -->
            <div class="d-flex align-items-center gap-xs flex-wrap">
              <span class="text-xs text-muted">${isAr ? 'وجهات سريعة:' : 'Quick Destinations:'}</span>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="دبي, الإمارات">دبي (Dubai)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="الرياض, السعودية">الرياض (Riyadh)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="مكة المكرمة, السعودية">مكة المكرمة (Makkah)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="إسطنبول, تركيا">إسطنبول (Istanbul)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="لندن, بريطانيا">لندن (London)</button>
              <button type="button" class="btn btn-xs btn-secondary quick-dest-chip" data-dest="باريس, فرنسا">باريس (Paris)</button>
            </div>

            <!-- Generate Action -->
            <div class="d-flex justify-content-end mt-xs">
              <button type="button" id="btn-generate-hotel" class="btn btn-primary d-flex align-items-center gap-xs" style="min-width: 220px;">
                <span class="btn-icon">${icons.sparkles('w-4 h-4')}</span>
                <span id="btn-generate-text">${escapeHtml(t('hotels.generateBtn'))}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Generated Voucher Preview Container -->
      <div id="hotel-preview-section" style="display: none;" class="mb-lg">
        <!-- Rendered dynamically upon generation -->
      </div>

      <!-- Saved Bookings Archive Table Card -->
      <div class="card">
        <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm">
          <div>
            <h3 class="card-title d-flex align-items-center gap-xs">
              ${icons.hotel('w-5 h-5')}
              ${escapeHtml(t('hotels.archiveTitle'))}
            </h3>
            <p class="text-xs text-muted mt-xxs">${escapeHtml(t('hotels.archiveSubtitle'))}</p>
          </div>
          <div class="d-flex align-items-center gap-xs">
            <input
              type="text"
              id="search-hotel-archive"
              class="form-control"
              placeholder="${isAr ? 'بحث في الحجوزات...' : 'Search bookings...'}"
              style="width: 240px; font-size: 13px;"
            />
          </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table" id="hotels-archive-table">
              <thead>
                <tr>
                  <th>${isAr ? 'كود المرجع' : 'Booking Ref'}</th>
                  <th>${escapeHtml(t('hotels.clientName'))}</th>
                  <th>${escapeHtml(t('hotels.hotelName'))}</th>
                  <th>${escapeHtml(t('hotels.destination'))}</th>
                  <th>${isAr ? 'فترة الإقامة' : 'Stay Dates'}</th>
                  <th>${escapeHtml(t('hotels.nights'))}</th>
                  <th>${escapeHtml(t('hotels.status'))}</th>
                  <th style="text-align: right;">${isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody id="hotels-table-body">
                <tr>
                  <td colspan="8" class="text-center p-xl text-muted">
                    ${isAr ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render the Preview Card for the generated hotel booking
 */
function renderPreviewCard(booking) {
  const isAr = i18n.getLanguage() === 'ar';
  const starsCount = Math.min(5, Math.max(1, parseInt(booking.hotelStars || 5, 10)));
  const starsHtml = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  const isPython = booking.source === 'BOOKING_LIVE' || booking.provider === 'PYTHON_SCRAPER';
  const sourceBadge = isPython
    ? `<span class="badge" style="background: #10b981; color: white; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
        ${isAr ? 'فندق حقيقي عبر بايثون (Booking.com)' : 'Live via Python (Booking.com)'}
       </span>`
    : `<span class="badge" style="background: #6366f1; color: white; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        ✦ ${isAr ? 'مقترح ذكي معتمد (دليل 5 نجوم)' : 'Smart Curated (5-Star)'}
       </span>`;

  return `
    <div class="card" style="border: 2px solid #b38d4f; background: var(--color-surface);">
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm" style="background: rgba(179, 141, 79, 0.08);">
        <div class="d-flex align-items-center gap-sm">
          <div style="background: #b38d4f; color: white; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            ${icons.hotel('w-5 h-5')}
          </div>
          <div>
            <div class="d-flex align-items-center gap-xs">
              <h4 class="card-title" style="margin: 0;">${escapeHtml(t('hotels.previewTitle'))}</h4>
              ${sourceBadge}
            </div>
            <p class="text-xs text-muted" style="margin: 0;">${escapeHtml(t('hotels.previewSubtitle'))}</p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-xs">
          <button type="button" id="btn-toggle-edit-hotel" class="btn btn-sm btn-secondary d-flex align-items-center gap-xxs">
            ${icons.pencil ? icons.pencil('w-3.5 h-3.5') : (icons.edit ? icons.edit('w-3.5 h-3.5') : '✏️')}
            <span>${escapeHtml(t('hotels.quickEdit'))}</span>
          </button>
          <button type="button" id="btn-print-voucher-now" class="btn btn-sm btn-primary d-flex align-items-center gap-xxs">
            ${icons.print ? icons.print('w-3.5 h-3.5') : '🖨️'}
            <span>${escapeHtml(t('hotels.printVoucher'))}</span>
          </button>
          <button type="button" id="btn-save-hotel-db" class="btn btn-sm btn-outline d-flex align-items-center gap-xxs">
            ${icons.check ? icons.check('w-3.5 h-3.5') : '💾'}
            <span id="save-btn-text">${escapeHtml(t('hotels.saveToSystem'))}</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Display Details Mode -->
        <div id="preview-display-mode">
          <div class="form-grid-3 mb-md">
            <div>
              <span class="text-xs text-muted d-block">${escapeHtml(t('hotels.clientName'))}</span>
              <strong class="text-sm" id="prev-client-name">${escapeHtml(booking.clientName)}</strong>
            </div>
            <div>
              <span class="text-xs text-muted d-block">${escapeHtml(t('hotels.destination'))}</span>
              <strong class="text-sm" id="prev-destination">${escapeHtml(booking.city)}, ${escapeHtml(booking.country)}</strong>
            </div>
            <div>
              <span class="text-xs text-muted d-block">${escapeHtml(t('hotels.status'))}</span>
              <span class="badge badge-success">${escapeHtml(booking.status || 'CONFIRMED')}</span>
            </div>
          </div>

          <div style="background: var(--color-background); border: 1px solid var(--color-border); border-radius: 8px; padding: 16px;" class="mb-md">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-xs mb-xs">
              <h4 style="margin: 0; font-size: 16px; color: var(--color-text);" id="prev-hotel-name">${escapeHtml(booking.hotelName)}</h4>
              <span style="color: #f59e0b; font-size: 15px;" id="prev-stars">${starsHtml} (${starsCount}-Star)</span>
            </div>
            <p class="text-xs text-muted mb-sm" id="prev-address">${escapeHtml(booking.hotelAddress || 'City Center')}</p>

            <div class="form-grid-4 text-xs">
              <div>
                <span class="text-muted d-block">${escapeHtml(t('hotels.checkIn'))}:</span>
                <strong id="prev-checkin">${formatDateDisplay(booking.checkIn)}</strong>
              </div>
              <div>
                <span class="text-muted d-block">${escapeHtml(t('hotels.checkOut'))}:</span>
                <strong id="prev-checkout">${formatDateDisplay(booking.checkOut)}</strong>
              </div>
              <div>
                <span class="text-muted d-block">${escapeHtml(t('hotels.roomType'))}:</span>
                <strong id="prev-room">${escapeHtml(booking.roomType)}</strong>
              </div>
              <div>
                <span class="text-muted d-block">${escapeHtml(t('hotels.boardBasis'))}:</span>
                <strong style="color: #0284c7;" id="prev-board">${escapeHtml(booking.boardBasis)}</strong>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center text-xs text-muted">
            <div>
              ${escapeHtml(t('hotels.bookingRef'))}: <strong class="tabular-nums" style="color: var(--color-text);">${escapeHtml(booking.bookingReference)}</strong> |
              ${escapeHtml(t('hotels.confirmationNumber'))}: <strong class="tabular-nums" style="color: var(--color-text);">${escapeHtml(booking.confirmationNumber)}</strong>
            </div>
            <div>
              <span style="color: #16a34a; font-weight: 600;">✓ All Room Charges Prepaid & Guaranteed</span>
            </div>
          </div>
        </div>

        <!-- Inline Quick Edit Mode (Hidden by default) -->
        <div id="preview-edit-mode" style="display: none;">
          <div class="form-grid-3 mb-sm">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.hotelName'))}</label>
              <input type="text" id="edit-hotel-name" class="form-control" value="${escapeHtml(booking.hotelName)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.roomType'))}</label>
              <input type="text" id="edit-room-type" class="form-control" value="${escapeHtml(booking.roomType)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.boardBasis'))}</label>
              <input type="text" id="edit-board-basis" class="form-control" value="${escapeHtml(booking.boardBasis)}" />
            </div>
          </div>

          <div class="form-grid-3 mb-sm">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.address'))}</label>
              <input type="text" id="edit-hotel-address" class="form-control" value="${escapeHtml(booking.hotelAddress || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.stars'))} (1-5)</label>
              <input type="number" id="edit-hotel-stars" class="form-control" min="1" max="5" value="${starsCount}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.confirmationNumber'))}</label>
              <input type="text" id="edit-confirmation-num" class="form-control" value="${escapeHtml(booking.confirmationNumber)}" />
            </div>
          </div>

          <div class="d-flex justify-content-end gap-xs">
            <button type="button" id="btn-cancel-edit" class="btn btn-sm btn-secondary">${isAr ? 'إلغاء' : 'Cancel'}</button>
            <button type="button" id="btn-save-inline-edit" class="btn btn-sm btn-primary">${isAr ? 'تطبيق التعديلات' : 'Apply Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render archive table rows
 */
function renderArchiveRows(bookings = []) {
  const isAr = i18n.getLanguage() === 'ar';
  if (!bookings || bookings.length === 0) {
    return `
      <tr>
        <td colspan="8" class="text-center p-xl text-muted">
          ${escapeHtml(t('hotels.noBookings'))}
        </td>
      </tr>
    `;
  }

  return bookings.map(b => {
    const starsCount = Math.min(5, Math.max(1, parseInt(b.hotelStars || 5, 10)));
    const starsHtml = '★'.repeat(starsCount);
    return `
      <tr data-booking-id="${b.id}">
        <td><strong class="tabular-nums">${escapeHtml(b.bookingReference)}</strong></td>
        <td>
          <div class="font-medium">${escapeHtml(b.clientName)}</div>
          ${b.customer ? `<span class="text-xs text-muted">${escapeHtml(b.customer.phone || '')}</span>` : ''}
        </td>
        <td>
          <div class="font-medium">${escapeHtml(b.hotelName)}</div>
          <span style="color: #f59e0b; font-size: 11px;">${starsHtml}</span>
        </td>
        <td>${escapeHtml(b.city)}, ${escapeHtml(b.country)}</td>
        <td class="text-xs">
          ${formatDateDisplay(b.checkIn)} → ${formatDateDisplay(b.checkOut)}
        </td>
        <td><span class="badge badge-secondary">${escapeHtml(String(b.nights))} ${escapeHtml(t('hotels.nights'))}</span></td>
        <td><span class="badge badge-success">${escapeHtml(b.status || 'CONFIRMED')}</span></td>
        <td style="text-align: right;">
          <div class="d-flex align-items-center justify-content-end gap-xxs">
            <button type="button" class="btn btn-xs btn-primary btn-reprint-voucher" data-id="${b.id}" title="${escapeHtml(t('hotels.reprint'))}">
              ${icons.print ? icons.print('w-3.5 h-3.5') : '🖨️'}
              <span>${isAr ? 'طباعة' : 'Print'}</span>
            </button>
            <button type="button" class="btn btn-xs btn-danger btn-delete-booking" data-id="${b.id}" title="${escapeHtml(t('hotels.deleteBooking'))}">
              ${icons.trash ? icons.trash('w-3.5 h-3.5') : '🗑️'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Fetch and refresh saved hotel bookings
 */
async function loadSavedBookings(root) {
  const container = root || document;
  try {
    const res = await HotelService.getBookings({ search: currentSearch });
    cachedBookings = res.data || [];
    const tbody = container.querySelector('#hotels-table-body') || document.getElementById('hotels-table-body');
    if (tbody) {
      tbody.innerHTML = renderArchiveRows(cachedBookings);
    }
  } catch (err) {
    console.error('[HotelsPage] Failed to load bookings:', err);
    const tbody = container.querySelector('#hotels-table-body') || document.getElementById('hotels-table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center p-md text-danger">
            ${escapeHtml(err.message || 'Failed to load hotel bookings')}
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Bind interactive events on the Hotels Page
 */
export function initHotelsPage(container) {
  const root = container || document;
  const isAr = i18n.getLanguage() === 'ar';
  const aiForm = root.querySelector('#hotel-ai-form') || document.getElementById('hotel-ai-form');
  const btnGen = root.querySelector('#btn-generate-hotel') || document.getElementById('btn-generate-hotel');
  const clientNameInput = root.querySelector('#hotel-client-name') || document.getElementById('hotel-client-name');
  const destinationInput = root.querySelector('#hotel-destination') || document.getElementById('hotel-destination');
  const checkinInput = root.querySelector('#hotel-checkin') || document.getElementById('hotel-checkin');
  const checkoutInput = root.querySelector('#hotel-checkout') || document.getElementById('hotel-checkout');
  const customerIdInput = root.querySelector('#hotel-customer-id') || document.getElementById('hotel-customer-id');
  const autocompleteList = root.querySelector('#customer-autocomplete-list') || document.getElementById('customer-autocomplete-list');
  const previewSection = root.querySelector('#hotel-preview-section') || document.getElementById('hotel-preview-section');
  const searchInput = root.querySelector('#search-hotel-archive') || document.getElementById('search-hotel-archive');

  // Load initial saved bookings list
  loadSavedBookings(root);

  // 1. Customer Autocomplete
  if (clientNameInput && autocompleteList) {
    clientNameInput.addEventListener('input', () => {
      const q = clientNameInput.value.trim().toLowerCase();
      if (!q || q.length < 1) {
        autocompleteList.style.display = 'none';
        autocompleteList.innerHTML = '';
        return;
      }

      const allCustomers = CustomerService.getAllCustomers();
      const matches = allCustomers.filter(c => c.name && c.name.toLowerCase().includes(q)).slice(0, 6);

      if (matches.length === 0) {
        autocompleteList.style.display = 'none';
        return;
      }

      autocompleteList.innerHTML = matches.map(c => `
        <div class="autocomplete-item p-xs cursor-pointer d-flex justify-content-between align-items-center"
             style="border-bottom: 1px solid var(--color-border); font-size: 13px; padding: 8px 12px;"
             data-id="${c.id}" data-name="${escapeHtml(c.name)}">
          <div>
            <strong>${escapeHtml(c.name)}</strong>
            ${c.passport ? `<span class="text-xs text-muted d-block">Passport: ${escapeHtml(c.passport)}</span>` : ''}
          </div>
          <span class="badge badge-secondary text-xs">${escapeHtml(c.phone || 'Customer')}</span>
        </div>
      `).join('');

      autocompleteList.style.display = 'block';
    });

    autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        clientNameInput.value = item.dataset.name;
        if (customerIdInput) customerIdInput.value = item.dataset.id;
        autocompleteList.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#hotel-client-name') && !e.target.closest('#customer-autocomplete-list')) {
        autocompleteList.style.display = 'none';
      }
    });
  }

  // 2. Quick Destination Chips
  root.querySelectorAll('.quick-dest-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (destinationInput) {
        destinationInput.value = chip.dataset.dest || '';
        destinationInput.focus();
      }
    });
  });

  // 3. AI Generation Handler (safe from any page reload)
  const handleGenerate = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isGenerating) return false;

    const clientName = clientNameInput?.value.trim();
    const country = destinationInput?.value.trim();
    const checkIn = checkinInput?.value;
    const checkOut = checkoutInput?.value;
    const customerId = customerIdInput?.value || null;

    if (!clientName || !country || !checkIn || !checkOut) {
      showToast(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', 'warning');
      return false;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      showToast(isAr ? 'تاريخ الخروج يجب أن يكون بعد تاريخ الدخول' : 'Check-out date must be after check-in date', 'warning');
      return false;
    }

    isGenerating = true;
    const btnGenText = root.querySelector('#btn-generate-text') || document.getElementById('btn-generate-text');
    if (btnGen) btnGen.disabled = true;
    if (btnGenText) btnGenText.textContent = t('hotels.generating');

    try {
      const res = await HotelService.generateAiBooking({
        clientName,
        country,
        checkIn,
        checkOut,
        customerId
      });

      currentGeneratedBooking = res.data;
      if (previewSection) {
        previewSection.innerHTML = renderPreviewCard(currentGeneratedBooking);
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        bindPreviewEvents(root);
      }

      showToast(isAr ? 'تم توليد بيانات الحجز الفندقي بنجاح!' : 'Hotel booking generated successfully!', 'success');
    } catch (err) {
      console.error('[HotelsPage] AI generation error:', err);
      showToast(err.message || (isAr ? 'فشل توليد الحجز بالذكاء الاصطناعي' : 'Failed to generate hotel booking'), 'error');
    } finally {
      isGenerating = false;
      if (btnGen) btnGen.disabled = false;
      if (btnGenText) btnGenText.textContent = t('hotels.generateBtn');
    }
    return false;
  };

  if (aiForm) {
    aiForm.addEventListener('submit', handleGenerate);
  }
  if (btnGen) {
    btnGen.addEventListener('click', handleGenerate);
  }

  // 4. Search Archive
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        currentSearch = searchInput.value.trim();
        loadSavedBookings(root);
      }, 300);
    });
  }

  // 5. Delegate Reprint & Delete actions on Table
  const table = root.querySelector('#hotels-archive-table') || document.getElementById('hotels-archive-table');
  if (table) {
    table.addEventListener('click', async (e) => {
      const reprintBtn = e.target.closest('.btn-reprint-voucher');
      if (reprintBtn) {
        const id = reprintBtn.dataset.id;
        const booking = cachedBookings.find(b => b.id === id);
        if (booking) {
          printHotelVoucher(booking);
        }
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete-booking');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm(t('hotels.deleteConfirm'))) return;
        try {
          await HotelService.deleteBooking(id);
          showToast(isAr ? 'تم حذف الحجز بنجاح' : 'Hotel booking deleted successfully', 'success');
          loadSavedBookings(root);
        } catch (err) {
          showToast(err.message || 'Failed to delete booking', 'error');
        }
      }
    });
  }
}

/**
 * Bind events inside the dynamically rendered Preview Card
 */
function bindPreviewEvents(root) {
  const container = root || document;
  const isAr = i18n.getLanguage() === 'ar';
  const printBtn = container.querySelector('#btn-print-voucher-now') || document.getElementById('btn-print-voucher-now');
  const saveBtn = container.querySelector('#btn-save-hotel-db') || document.getElementById('btn-save-hotel-db');
  const toggleEditBtn = container.querySelector('#btn-toggle-edit-hotel') || document.getElementById('btn-toggle-edit-hotel');
  const displayMode = container.querySelector('#preview-display-mode') || document.getElementById('preview-display-mode');
  const editMode = container.querySelector('#preview-edit-mode') || document.getElementById('preview-edit-mode');
  const cancelEditBtn = container.querySelector('#btn-cancel-edit') || document.getElementById('btn-cancel-edit');
  const applyEditBtn = container.querySelector('#btn-save-inline-edit') || document.getElementById('btn-save-inline-edit');

  // Print voucher button
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (currentGeneratedBooking) {
        printHotelVoucher(currentGeneratedBooking);
      }
    });
  }

  // Save to DB button
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!currentGeneratedBooking || isSaving) return;
      isSaving = true;
      saveBtn.disabled = true;
      const saveText = container.querySelector('#save-btn-text') || document.getElementById('save-btn-text');
      if (saveText) saveText.textContent = t('hotels.saving');

      try {
        await HotelService.createBooking(currentGeneratedBooking);
        showToast(t('hotels.savedSuccess'), 'success');
        saveBtn.classList.remove('btn-outline');
        saveBtn.classList.add('btn-success');
        if (saveText) saveText.textContent = isAr ? '✓ تم الحفظ' : '✓ Saved';
        loadSavedBookings(container);
      } catch (err) {
        showToast(err.message || 'Failed to save booking', 'error');
        saveBtn.disabled = false;
        if (saveText) saveText.textContent = t('hotels.saveToSystem');
      } finally {
        isSaving = false;
      }
    });
  }

  // Toggle quick inline edit
  if (toggleEditBtn && displayMode && editMode) {
    toggleEditBtn.addEventListener('click', () => {
      displayMode.style.display = 'none';
      editMode.style.display = 'block';
    });
  }

  if (cancelEditBtn && displayMode && editMode) {
    cancelEditBtn.addEventListener('click', () => {
      editMode.style.display = 'none';
      displayMode.style.display = 'block';
    });
  }

  if (applyEditBtn && displayMode && editMode) {
    applyEditBtn.addEventListener('click', () => {
      const editHotelName = (container.querySelector('#edit-hotel-name') || document.getElementById('edit-hotel-name'))?.value.trim();
      const editRoomType = (container.querySelector('#edit-room-type') || document.getElementById('edit-room-type'))?.value.trim();
      const editBoardBasis = (container.querySelector('#edit-board-basis') || document.getElementById('edit-board-basis'))?.value.trim();
      const editAddress = (container.querySelector('#edit-hotel-address') || document.getElementById('edit-hotel-address'))?.value.trim();
      const editStars = parseInt((container.querySelector('#edit-hotel-stars') || document.getElementById('edit-hotel-stars'))?.value || '5', 10);
      const editConfNum = (container.querySelector('#edit-confirmation-num') || document.getElementById('edit-confirmation-num'))?.value.trim();

      if (editHotelName) currentGeneratedBooking.hotelName = editHotelName;
      if (editRoomType) currentGeneratedBooking.roomType = editRoomType;
      if (editBoardBasis) currentGeneratedBooking.boardBasis = editBoardBasis;
      if (editAddress) currentGeneratedBooking.hotelAddress = editAddress;
      if (editStars) currentGeneratedBooking.hotelStars = editStars;
      if (editConfNum) currentGeneratedBooking.confirmationNumber = editConfNum;

      // Update preview card displays
      const nameEl = container.querySelector('#prev-hotel-name') || document.getElementById('prev-hotel-name');
      const roomEl = container.querySelector('#prev-room') || document.getElementById('prev-room');
      const boardEl = container.querySelector('#prev-board') || document.getElementById('prev-board');
      const addrEl = container.querySelector('#prev-address') || document.getElementById('prev-address');
      const starsEl = container.querySelector('#prev-stars') || document.getElementById('prev-stars');

      if (nameEl) nameEl.textContent = currentGeneratedBooking.hotelName;
      if (roomEl) roomEl.textContent = currentGeneratedBooking.roomType;
      if (boardEl) boardEl.textContent = currentGeneratedBooking.boardBasis;
      if (addrEl) addrEl.textContent = currentGeneratedBooking.hotelAddress;
      if (starsEl) starsEl.textContent = '★'.repeat(currentGeneratedBooking.hotelStars) + ` (${currentGeneratedBooking.hotelStars}-Star)`;

      editMode.style.display = 'none';
      displayMode.style.display = 'block';
      showToast(isAr ? 'تم تطبيق التعديلات بنجاح' : 'Changes applied', 'info');
    });
  }
}

export const HotelsPage = {
  render: renderHotelsPage,
  afterRender(container) {
    initHotelsPage(container);
  },
  init: initHotelsPage
};


