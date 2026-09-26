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

  const printWindow = window.open('', '_blank', 'width=940,height=980');
  if (!printWindow) {
    showToast('Please allow popups to download or print the voucher PDF.', 'warning');
    return;
  }

  const checkInFormatted = formatDateDisplay(booking.checkIn);
  const checkOutFormatted = formatDateDisplay(booking.checkOut);
  const starsCount = Math.min(5, Math.max(1, parseInt(booking.hotelStars || 5, 10)));
  const starsHtml = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  const getDayName = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  const checkInDay = getDayName(booking.checkIn);
  const checkOutDay = getDayName(booking.checkOut);

  const bookingNumber = booking.bookingNumber || (booking.bookingReference && booking.bookingReference.includes('.') ? booking.bookingReference : '4829.391.820');
  const pinCode = booking.pinCode || '4829';
  const hotelPhone = booking.hotelPhone || '+971 4 430 4528';
  const priceText = booking.price || 'US$ 450';
  const reviewScore = booking.reviewScore || '9.1 Superb · 3,150 reviews';
  const hotelImage = booking.hotelImage || '';

  // Official Booking.com Confirmation Voucher (English)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Booking.com: Confirmation - ${escapeHtml(booking.hotelName || 'Hotel')}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      background: #f4f6f8;
      font-size: 13px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-btn-bar {
      max-width: 820px;
      margin: 14px auto;
      text-align: right;
    }
    .print-btn {
      background: #003580;
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      transition: background 0.15s;
    }
    .print-btn:hover {
      background: #00224f;
    }
    .voucher-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dcdcdc;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .booking-top-bar {
      background: #003580;
      color: #ffffff;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .booking-logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1;
    }
    .booking-logo span {
      color: #00BAF2;
    }
    .booking-subtext {
      color: #dbeafe;
      font-size: 12px;
      font-weight: 500;
      margin-top: 4px;
    }
    .booking-identifiers {
      text-align: right;
      color: #ffffff;
    }
    .id-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.85;
    }
    .id-val {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    }
    .status-confirmed-banner {
      background: #ebf3ff;
      border-bottom: 2px solid #003580;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .status-check-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #008009;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      flex-shrink: 0;
    }
    .status-title {
      font-size: 16px;
      font-weight: 700;
      color: #008009;
    }
    .status-sub {
      font-size: 12.5px;
      color: #333333;
      margin-top: 2px;
    }
    .content-container {
      padding: 24px;
    }
    .hotel-card {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 1px solid #e7e7e7;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .hotel-title {
      font-size: 22px;
      font-weight: 800;
      color: #003580;
      margin-bottom: 4px;
      line-height: 1.25;
    }
    .hotel-stars {
      color: #febb02;
      font-size: 16px;
      margin-bottom: 6px;
    }
    .hotel-address {
      font-size: 13px;
      color: #262626;
      margin-bottom: 4px;
    }
    .hotel-phone {
      font-size: 13px;
      color: #262626;
      margin-bottom: 8px;
    }
    .review-score-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f0f7ff;
      border: 1px solid #c7e0ff;
      padding: 4px 10px;
      border-radius: 4px;
      margin-top: 4px;
    }
    .score-square {
      background: #003580;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .score-label {
      font-size: 12px;
      font-weight: 700;
      color: #003580;
    }
    .hotel-photo {
      width: 140px;
      height: 105px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .date-col {
      border-right: 1px solid #e2e8f0;
      padding-right: 12px;
    }
    .date-col:last-child {
      border-right: none;
      padding-right: 0;
    }
    .date-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .date-val {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
    }
    .date-time {
      font-size: 12px;
      color: #475569;
      margin-top: 3px;
    }
    .section-block {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .section-header {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .room-name {
      font-size: 15px;
      font-weight: 700;
      color: #003580;
      margin-bottom: 8px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .details-table td {
      padding: 5px 0;
      font-size: 13px;
    }
    .details-table .col-label {
      color: #64748b;
      width: 32%;
      font-weight: 500;
    }
    .details-table .col-val {
      color: #0f172a;
      font-weight: 600;
    }
    .amenities-row {
      font-size: 12px;
      color: #475569;
      border-top: 1px dashed #e2e8f0;
      padding-top: 10px;
      margin-top: 8px;
      line-height: 1.5;
    }
    .payment-table {
      width: 100%;
      border-collapse: collapse;
    }
    .payment-table td {
      padding: 6px 0;
      font-size: 13px;
    }
    .price-row-total {
      font-size: 16px;
      font-weight: 800;
      color: #003580;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 0;
    }
    .payment-badge-online {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 4px;
      padding: 10px 14px;
      margin-top: 12px;
      font-size: 12.5px;
      color: #166534;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cancellation-block {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 12px 16px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 20px;
      font-size: 12.5px;
    }
    .cancellation-title {
      font-weight: 700;
      color: #166534;
      margin-bottom: 2px;
    }
    .cancellation-desc {
      color: #334155;
    }
    .official-footer {
      border-top: 2px solid #e2e8f0;
      padding: 18px 24px;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
    }
    .footer-help-title {
      font-size: 13px;
      font-weight: 700;
      color: #003580;
      margin-bottom: 4px;
    }
    .footer-help-text {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.5;
    }
    .footer-legal {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 8px;
      line-height: 1.4;
    }
    .barcode-box {
      text-align: right;
    }
    .barcode-svg {
      width: 170px;
      height: 32px;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .print-btn-bar {
        display: none !important;
      }
      .voucher-wrapper {
        border: none;
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="voucher-wrapper">
    <!-- Booking.com Official Header -->
    <div class="booking-top-bar">
      <div>
        <div class="booking-logo">Booking<span>.com</span></div>
        <div class="booking-subtext">Booking Confirmation</div>
      </div>
      <div class="booking-identifiers">
        <div class="id-label">CONFIRMATION NUMBER</div>
        <div class="id-val">${escapeHtml(bookingNumber)}</div>
        <div class="id-label" style="margin-top: 5px;">PIN CODE</div>
        <div class="id-val" style="letter-spacing: 2px;">${escapeHtml(pinCode)}</div>
      </div>
    </div>

    <!-- Confirmed Status Banner -->
    <div class="status-confirmed-banner">
      <div class="status-check-circle">✓</div>
      <div>
        <div class="status-title">Your booking in ${escapeHtml(booking.city || booking.country || 'Destination')} is confirmed.</div>
        <div class="status-sub">Thank you, <strong>${escapeHtml(booking.clientName || 'Guest')}</strong>! We look forward to your arrival.</div>
      </div>
    </div>

    <div class="content-container">
      <!-- Hotel Details Block -->
      <div class="hotel-card">
        <div style="flex: 1;">
          <div class="hotel-title">${escapeHtml(booking.hotelName || 'Grand Hotel')}</div>
          <div class="hotel-stars">${starsHtml} (${starsCount}-Star Hotel)</div>
          <div class="hotel-address">📍 ${escapeHtml(booking.hotelAddress || 'City Center')}</div>
          <div class="hotel-phone">📞 Phone: <strong>${escapeHtml(hotelPhone)}</strong></div>
          <div class="review-score-badge">
            <span class="score-square">${escapeHtml((reviewScore.match(/\d+\.\d+/) || ['9.0'])[0])}</span>
            <span class="score-label">${escapeHtml(reviewScore)}</span>
          </div>
        </div>
        ${hotelImage ? `<img src="${escapeHtml(hotelImage)}" class="hotel-photo" alt="${escapeHtml(booking.hotelName)}" />` : ''}
      </div>

      <!-- Stay Schedule (Booking.com 3-column layout) -->
      <div class="dates-grid">
        <div class="date-col">
          <div class="date-label">CHECK-IN</div>
          <div class="date-val">${escapeHtml(checkInDay)}, ${escapeHtml(checkInFormatted)}</div>
          <div class="date-time">From 15:00</div>
        </div>
        <div class="date-col">
          <div class="date-label">CHECK-OUT</div>
          <div class="date-val">${escapeHtml(checkOutDay)}, ${escapeHtml(checkOutFormatted)}</div>
          <div class="date-time">Until 12:00</div>
        </div>
        <div class="date-col">
          <div class="date-label">LENGTH OF STAY</div>
          <div class="date-val">${escapeHtml(String(booking.nights || 1))} night${booking.nights > 1 ? 's' : ''}</div>
          <div class="date-time">1 room, 1 adult</div>
        </div>
      </div>

      <!-- Room & Guest Information -->
      <div class="section-block">
        <div class="section-header">Room Details</div>
        <div class="room-name">Room 1: ${escapeHtml(booking.roomType || 'Deluxe King Room')}</div>
        <table class="details-table">
          <tr>
            <td class="col-label">Guest name:</td>
            <td class="col-val">${escapeHtml(booking.clientName || 'Valued Guest')}</td>
          </tr>
          <tr>
            <td class="col-label">Meal plan:</td>
            <td class="col-val" style="color: #008009;">${escapeHtml(booking.boardBasis || 'Breakfast included')}</td>
          </tr>
          <tr>
            <td class="col-label">Occupancy:</td>
            <td class="col-val">1 Adult (Standard Occupancy)</td>
          </tr>
          <tr>
            <td class="col-label">Special requests:</td>
            <td class="col-val">${escapeHtml(booking.specialRequests || 'Non-smoking room, high floor requested')}</td>
          </tr>
        </table>
        <div class="amenities-row">
          <strong>Room Amenities:</strong> Free high-speed WiFi • Air conditioning • Private bathroom • Flat-screen TV • Soundproofing • Free toiletries • Safe
        </div>
      </div>

      <!-- Payment & Price Information -->
      <div class="section-block">
        <div class="section-header">Pricing & Payment</div>
        <table class="payment-table">
          <tr>
            <td>Price (${escapeHtml(String(booking.nights || 1))} night${booking.nights > 1 ? 's' : ''})</td>
            <td style="text-align: right; font-weight: 600;">${escapeHtml(priceText)}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 12px;">Taxes and charges included (VAT, City Tax)</td>
            <td style="text-align: right; color: #64748b; font-size: 12px;">Included</td>
          </tr>
          <tr class="price-row-total">
            <td>Total Price</td>
            <td style="text-align: right;">${escapeHtml(priceText)}</td>
          </tr>
          <tr>
            <td style="padding-top: 8px; color: #008009; font-weight: 600;">Amount Paid Online:</td>
            <td style="text-align: right; padding-top: 8px; color: #008009; font-weight: 600;">${escapeHtml(priceText)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600;">Amount due upon check-in:</td>
            <td style="text-align: right; font-weight: 700; color: #008009;">US$ 0.00</td>
          </tr>
        </table>
        <div class="payment-badge-online">
          <span>✓</span>
          <span><strong>Paid online</strong> — You have already paid for this booking online. The property will not charge you for your room upon arrival.</span>
        </div>
      </div>

      <!-- Cancellation Policy -->
      <div class="cancellation-block">
        <div class="cancellation-title">✓ Free Cancellation</div>
        <div class="cancellation-desc">
          You can cancel free of charge until 48 hours prior to check-in. If you cancel within 48 hours of arrival or in case of a no-show, the cancellation fee will equal the total reservation cost.
        </div>
      </div>
    </div>

    <!-- Official Booking.com Legal & Support Footer -->
    <div class="official-footer">
      <div>
        <div class="footer-help-title">Customer Service Help</div>
        <div class="footer-help-text">
          Manage your booking online at <strong>www.booking.com/mybooking</strong><br>
          Direct property phone: <strong>${escapeHtml(hotelPhone)}</strong><br>
          Booking.com Customer Support: Available 24 hours a day, 7 days a week (English & Arabic)
        </div>
        <div class="footer-legal">
          Booking.com B.V., Oosterdokskade 163, 1011 DL Amsterdam, The Netherlands<br>
          Chamber of Commerce Amsterdam registration: 31047344 • VAT registration: NL805734958B01
        </div>
      </div>
      <div class="barcode-box">
        <svg class="barcode-svg" viewBox="0 0 160 30" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="3" height="30" fill="#003580"/>
          <rect x="5" y="0" width="2" height="30" fill="#003580"/>
          <rect x="10" y="0" width="5" height="30" fill="#003580"/>
          <rect x="18" y="0" width="2" height="30" fill="#003580"/>
          <rect x="23" y="0" width="4" height="30" fill="#003580"/>
          <rect x="30" y="0" width="2" height="30" fill="#003580"/>
          <rect x="35" y="0" width="6" height="30" fill="#003580"/>
          <rect x="44" y="0" width="2" height="30" fill="#003580"/>
          <rect x="49" y="0" width="4" height="30" fill="#003580"/>
          <rect x="56" y="0" width="3" height="30" fill="#003580"/>
          <rect x="62" y="0" width="5" height="30" fill="#003580"/>
          <rect x="70" y="0" width="2" height="30" fill="#003580"/>
          <rect x="75" y="0" width="4" height="30" fill="#003580"/>
          <rect x="82" y="0" width="3" height="30" fill="#003580"/>
          <rect x="88" y="0" width="6" height="30" fill="#003580"/>
          <rect x="97" y="0" width="2" height="30" fill="#003580"/>
          <rect x="102" y="0" width="4" height="30" fill="#003580"/>
          <rect x="109" y="0" width="3" height="30" fill="#003580"/>
          <rect x="115" y="0" width="5" height="30" fill="#003580"/>
          <rect x="123" y="0" width="2" height="30" fill="#003580"/>
          <rect x="128" y="0" width="4" height="30" fill="#003580"/>
          <rect x="135" y="0" width="6" height="30" fill="#003580"/>
          <rect x="144" y="0" width="3" height="30" fill="#003580"/>
          <rect x="150" y="0" width="4" height="30" fill="#003580"/>
        </svg>
        <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 2px;">
          ${escapeHtml(bookingNumber)}
        </div>
      </div>
    </div>
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

  const bookingNumber = booking.bookingNumber || (booking.bookingReference && booking.bookingReference.includes('.') ? booking.bookingReference : '4829.391.820');
  const pinCode = booking.pinCode || '4829';
  const priceText = booking.price || 'US$ 450';
  const hotelPhone = booking.hotelPhone || '+971 4 430 4528';
  const reviewScore = booking.reviewScore || '9.1 Superb · 3,150 reviews';
  const hotelImage = booking.hotelImage || '';

  const isPython = booking.source === 'BOOKING_LIVE' || booking.provider === 'PYTHON_SCRAPER';
  const sourceBadge = isPython
    ? `<span class="badge" style="background: #10b981; color: white; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></span>
        ${isAr ? 'بيانات حية مباشرة من Booking.com' : 'Live from Booking.com'}
       </span>`
    : `<span class="badge" style="background: #00BAF2; color: #003580; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">
        ✦ ${isAr ? 'كتالوج بوكينج المعتمد' : 'Booking.com Catalog'}
       </span>`;

  return `
    <div class="card" style="border: 2px solid #003580; background: var(--color-surface); box-shadow: 0 4px 12px rgba(0, 53, 128, 0.1);">
      <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-sm" style="background: #003580; color: #ffffff;">
        <div class="d-flex align-items-center gap-sm">
          <div style="background: #ffffff; color: #003580; width: 38px; height: 38px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">
            B.
          </div>
          <div>
            <div class="d-flex align-items-center gap-xs">
              <h4 class="card-title" style="margin: 0; color: #ffffff; font-weight: 800; font-size: 16px;">
                Booking<span style="color: #00BAF2;">.com</span> Confirmation
              </h4>
              ${sourceBadge}
            </div>
            <p class="text-xs" style="margin: 0; color: #dbeafe;">${escapeHtml(t('hotels.previewSubtitle'))}</p>
          </div>
        </div>

        <div class="d-flex align-items-center gap-xs">
          <button type="button" id="btn-toggle-edit-hotel" class="btn btn-sm btn-secondary d-flex align-items-center gap-xxs" style="background: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.3);">
            ${icons.pencil ? icons.pencil('w-3.5 h-3.5') : '✏️'}
            <span>${escapeHtml(t('hotels.quickEdit'))}</span>
          </button>
          <button type="button" id="btn-print-voucher-now" class="btn btn-sm d-flex align-items-center gap-xxs" style="background: #febb02; color: #0f172a; font-weight: 700; border: none;">
            ${icons.print ? icons.print('w-3.5 h-3.5') : '🖨️'}
            <span>${isAr ? 'طباعة تأكيد بوكينج (PDF)' : 'Print Booking.com PDF'}</span>
          </button>
          <button type="button" id="btn-save-hotel-db" class="btn btn-sm btn-outline d-flex align-items-center gap-xxs" style="color: #ffffff; border-color: rgba(255,255,255,0.4);">
            ${icons.check ? icons.check('w-3.5 h-3.5') : '💾'}
            <span id="save-btn-text">${escapeHtml(t('hotels.saveToSystem'))}</span>
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Display Details Mode -->
        <div id="preview-display-mode">
          <!-- Top Status & Identifiers Bar -->
          <div style="background: #ebf3ff; border: 1px solid #c7e0ff; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap-sm;">
            <div class="d-flex align-items-center gap-xs">
              <span style="background: #008009; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold;">✓</span>
              <div>
                <strong style="color: #008009; font-size: 14px;">Booking Confirmed</strong>
                <span class="text-xs text-muted d-block">${escapeHtml(booking.clientName)} · 1 Room, ${escapeHtml(String(booking.nights || 1))} Night(s)</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="text-xs text-muted">CONFIRMATION: <strong style="color: #003580; font-family: monospace; font-size: 13px;" id="prev-booking-num">${escapeHtml(bookingNumber)}</strong></div>
              <div class="text-xs text-muted">PIN CODE: <strong style="color: #003580; font-family: monospace; font-size: 13px; letter-spacing: 1px;" id="prev-pin-code">${escapeHtml(pinCode)}</strong></div>
            </div>
          </div>

          <div style="background: var(--color-background); border: 1px solid var(--color-border); border-radius: 8px; padding: 16px;" class="mb-md">
            <div class="d-flex align-items-start justify-content-between flex-wrap gap-sm mb-sm">
              <div style="flex: 1;">
                <div class="d-flex align-items-center gap-xs flex-wrap">
                  <h4 style="margin: 0; font-size: 18px; color: #003580; font-weight: 800;" id="prev-hotel-name">${escapeHtml(booking.hotelName)}</h4>
                  <span style="color: #febb02; font-size: 15px;" id="prev-stars">${starsHtml}</span>
                </div>
                <p class="text-xs text-muted mt-xxs mb-xxs" id="prev-address">📍 ${escapeHtml(booking.hotelAddress || 'City Center')}</p>
                <div class="text-xs text-muted mb-xs" id="prev-phone">📞 Phone: <strong style="color: var(--color-text);">${escapeHtml(hotelPhone)}</strong></div>
                <div class="d-flex align-items-center gap-xs">
                  <span class="badge" style="background: #003580; color: #ffffff; font-weight: 800; font-size: 12px; padding: 2px 6px;">${escapeHtml((reviewScore.match(/\d+\.\d+/) || ['9.0'])[0])}</span>
                  <span class="text-xs font-semibold" style="color: #003580;">${escapeHtml(reviewScore)}</span>
                </div>
              </div>

              ${hotelImage ? `<img src="${escapeHtml(hotelImage)}" style="width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border);" alt="${escapeHtml(booking.hotelName)}" />` : ''}
            </div>

            <div class="form-grid-4 text-xs pt-xs" style="border-top: 1px solid var(--color-border);">
              <div>
                <span class="text-muted d-block">CHECK-IN:</span>
                <strong id="prev-checkin">${formatDateDisplay(booking.checkIn)} (from 15:00)</strong>
              </div>
              <div>
                <span class="text-muted d-block">CHECK-OUT:</span>
                <strong id="prev-checkout">${formatDateDisplay(booking.checkOut)} (until 12:00)</strong>
              </div>
              <div>
                <span class="text-muted d-block">ROOM CATEGORY:</span>
                <strong id="prev-room">${escapeHtml(booking.roomType)}</strong>
              </div>
              <div>
                <span class="text-muted d-block">TOTAL PRICE:</span>
                <strong style="color: #003580; font-size: 13px;" id="prev-price">${escapeHtml(priceText)}</strong>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center text-xs text-muted flex-wrap gap-xs">
            <div>
              MEAL: <strong style="color: #008009;" id="prev-board">${escapeHtml(booking.boardBasis)}</strong> |
              SPECIAL REQUESTS: <span id="prev-requests">${escapeHtml(booking.specialRequests || 'Non-smoking, high floor')}</span>
            </div>
            <div>
              <span style="color: #008009; font-weight: 700;">✓ PAID ONLINE — Fully Prepaid on Booking.com</span>
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

          <div class="form-grid-4 mb-sm">
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.address'))}</label>
              <input type="text" id="edit-hotel-address" class="form-control" value="${escapeHtml(booking.hotelAddress || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Hotel Phone</label>
              <input type="text" id="edit-hotel-phone" class="form-control" value="${escapeHtml(hotelPhone)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Price (USD / EUR)</label>
              <input type="text" id="edit-hotel-price" class="form-control" value="${escapeHtml(priceText)}" />
            </div>
            <div class="form-group">
              <label class="form-label">${escapeHtml(t('hotels.stars'))} (1-5)</label>
              <input type="number" id="edit-hotel-stars" class="form-control" min="1" max="5" value="${starsCount}" />
            </div>
          </div>

          <div class="form-grid-2 mb-sm">
            <div class="form-group">
              <label class="form-label">Booking.com Confirmation Number</label>
              <input type="text" id="edit-booking-number" class="form-control" value="${escapeHtml(bookingNumber)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Booking.com PIN Code</label>
              <input type="text" id="edit-pin-code" class="form-control" value="${escapeHtml(pinCode)}" />
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
      const editPhone = (container.querySelector('#edit-hotel-phone') || document.getElementById('edit-hotel-phone'))?.value.trim();
      const editPrice = (container.querySelector('#edit-hotel-price') || document.getElementById('edit-hotel-price'))?.value.trim();
      const editBookingNum = (container.querySelector('#edit-booking-number') || document.getElementById('edit-booking-number'))?.value.trim();
      const editPinCode = (container.querySelector('#edit-pin-code') || document.getElementById('edit-pin-code'))?.value.trim();

      if (editHotelName) currentGeneratedBooking.hotelName = editHotelName;
      if (editRoomType) currentGeneratedBooking.roomType = editRoomType;
      if (editBoardBasis) currentGeneratedBooking.boardBasis = editBoardBasis;
      if (editAddress) currentGeneratedBooking.hotelAddress = editAddress;
      if (editStars) currentGeneratedBooking.hotelStars = editStars;
      if (editPhone) currentGeneratedBooking.hotelPhone = editPhone;
      if (editPrice) currentGeneratedBooking.price = editPrice;
      if (editBookingNum) {
        currentGeneratedBooking.bookingNumber = editBookingNum;
        currentGeneratedBooking.bookingReference = editBookingNum;
      }
      if (editPinCode) {
        currentGeneratedBooking.pinCode = editPinCode;
        currentGeneratedBooking.confirmationNumber = editPinCode;
      }

      // Update preview card displays
      const nameEl = container.querySelector('#prev-hotel-name') || document.getElementById('prev-hotel-name');
      const roomEl = container.querySelector('#prev-room') || document.getElementById('prev-room');
      const boardEl = container.querySelector('#prev-board') || document.getElementById('prev-board');
      const addrEl = container.querySelector('#prev-address') || document.getElementById('prev-address');
      const starsEl = container.querySelector('#prev-stars') || document.getElementById('prev-stars');
      const phoneEl = container.querySelector('#prev-phone') || document.getElementById('prev-phone');
      const priceEl = container.querySelector('#prev-price') || document.getElementById('prev-price');
      const bNumEl = container.querySelector('#prev-booking-num') || document.getElementById('prev-booking-num');
      const pinEl = container.querySelector('#prev-pin-code') || document.getElementById('prev-pin-code');

      if (nameEl) nameEl.textContent = currentGeneratedBooking.hotelName;
      if (roomEl) roomEl.textContent = currentGeneratedBooking.roomType;
      if (boardEl) boardEl.textContent = currentGeneratedBooking.boardBasis;
      if (addrEl) addrEl.textContent = `📍 ${currentGeneratedBooking.hotelAddress}`;
      if (starsEl) starsEl.textContent = '★'.repeat(currentGeneratedBooking.hotelStars);
      if (phoneEl) phoneEl.innerHTML = `📞 Phone: <strong style="color: var(--color-text);">${currentGeneratedBooking.hotelPhone}</strong>`;
      if (priceEl) priceEl.textContent = currentGeneratedBooking.price;
      if (bNumEl) bNumEl.textContent = currentGeneratedBooking.bookingNumber;
      if (pinEl) pinEl.textContent = currentGeneratedBooking.pinCode;

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


