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

  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) {
    showToast('Please allow popups to download or print the voucher PDF.', 'warning');
    return;
  }

  const inDate = new Date(booking.checkIn);
  const outDate = new Date(booking.checkOut);

  const inDayNum = inDate.getDate();
  const inMonth = inDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const inDayName = inDate.toLocaleDateString('en-US', { weekday: 'long' });

  const outDayNum = outDate.getDate();
  const outMonth = outDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const outDayName = outDate.toLocaleDateString('en-US', { weekday: 'long' });

  const nights = booking.nights || 1;
  const bookingNumber = booking.bookingNumber || (booking.bookingReference && booking.bookingReference.includes('.') ? booking.bookingReference : '5647.617.021');
  const pinCode = booking.pinCode || '0409';
  const hotelPhone = booking.hotelPhone || '+60 11 6450 6138';
  const hotelImage = booking.hotelImage || 'https://cf.bstatic.com/xdata/images/hotel/square240/268428960.webp?k=9205129765918ca1e35e1c6581d1a459210416266389686d9500fd75e8dd9b9a&o=';
  const clientName = booking.clientName || 'Moustafa Elsayed Akl';
  const hotelName = booking.hotelName || 'Klcc Stay At Summer Suites';
  const hotelAddress = booking.hotelAddress || '8, Jalan Cendana, 50250 Kuala Lumpur, Malaysia';
  const roomType = booking.roomType || 'Studio with Balcony';
  const boardBasis = booking.boardBasis || 'No meal is included in this room rate.';

  const cleanDest = (booking.country || booking.city || '').toLowerCase();
  let localCurrency = 'USD';
  let localSymbol = 'US$ ';
  let exRateToEgp = 48.5;

  if (cleanDest.includes('malaysia') || cleanDest.includes('kuala lumpur')) {
    localCurrency = 'MYR';
    localSymbol = 'MYR ';
    exRateToEgp = 11.2;
  } else if (cleanDest.includes('uae') || cleanDest.includes('dubai') || cleanDest.includes('abu dhabi')) {
    localCurrency = 'AED';
    localSymbol = 'AED ';
    exRateToEgp = 13.2;
  } else if (cleanDest.includes('saudi') || cleanDest.includes('riyadh') || cleanDest.includes('makkah')) {
    localCurrency = 'SAR';
    localSymbol = 'SAR ';
    exRateToEgp = 12.9;
  } else if (cleanDest.includes('france') || cleanDest.includes('paris') || cleanDest.includes('italy') || cleanDest.includes('germany') || cleanDest.includes('spain')) {
    localCurrency = 'EUR';
    localSymbol = '€ ';
    exRateToEgp = 53.0;
  } else if (cleanDest.includes('uk') || cleanDest.includes('london') || cleanDest.includes('britain')) {
    localCurrency = 'GBP';
    localSymbol = '£ ';
    exRateToEgp = 63.5;
  } else if (cleanDest.includes('turkey') || cleanDest.includes('istanbul')) {
    localCurrency = 'TRY';
    localSymbol = 'TL ';
    exRateToEgp = 1.4;
  }

  let egpTotal = 56421;
  if (booking.price) {
    const digitsOnly = booking.price.replace(/[^\d]/g, '');
    if (digitsOnly && parseInt(digitsOnly, 10) > 0) {
      const num = parseInt(digitsOnly, 10);
      egpTotal = num > 1000 ? num : Math.round(num * exRateToEgp);
    }
  } else {
    egpTotal = Math.round(2089 * nights);
  }

  const vatAmount = Math.round(egpTotal * 0.08);
  const tourismFee = Math.round(127.09 * nights);
  const serviceCharge = Math.round(egpTotal * 0.15);
  const grandTotalEgp = egpTotal + vatAmount + tourismFee + serviceCharge;
  const localPayAmount = (grandTotalEgp / exRateToEgp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const localSubtotal = (egpTotal / exRateToEgp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let gpsCoords = 'N 003° 9.552, E 101° 42.293';
  if (cleanDest.includes('dubai')) gpsCoords = 'N 025° 12.180, E 055° 18.240';
  else if (cleanDest.includes('paris')) gpsCoords = 'N 048° 51.240, E 002° 21.070';
  else if (cleanDest.includes('london')) gpsCoords = 'N 051° 30.260, W 000° 07.390';
  else if (cleanDest.includes('riyadh')) gpsCoords = 'N 024° 42.810, E 046° 40.520';
  else if (cleanDest.includes('cairo')) gpsCoords = 'N 030° 02.880, E 031° 14.220';
  else if (cleanDest.includes('istanbul')) gpsCoords = 'N 041° 00.490, E 028° 58.330';

  const cancellationDateStr = `${inMonth} ${Math.max(1, inDayNum - 1)}, ${inDate.getFullYear()} 3:13 AM`;

  // 1:1 Pixel-Perfect Official Booking.com Confirmation PDF
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Booking.com: Confirmation - ${escapeHtml(hotelName)}</title>
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
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-btn-bar {
      max-width: 800px;
      margin: 10px auto;
      text-align: right;
    }
    .print-btn {
      background: #003580;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 3px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .doc-page {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .logo-text {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #003580;
      font-family: Arial, sans-serif;
    }
    .logo-text span {
      color: #00BAF2;
    }
    .header-right {
      text-align: right;
      vertical-align: top;
      font-family: Arial, sans-serif;
    }
    .confirmation-title {
      font-size: 17px;
      font-weight: bold;
      color: #000000;
    }
    .conf-num-label {
      font-size: 10.5px;
      margin-top: 3px;
      color: #333333;
    }
    .conf-num-val {
      color: #0071c2;
      font-weight: bold;
      font-size: 12.5px;
    }
    .top-box-table {
      width: 100%;
      border: 1px solid #777777;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .top-box-table td {
      border: 1px solid #777777;
      padding: 8px 10px;
      vertical-align: top;
    }
    .hotel-info-col {
      width: 50%;
    }
    .hotel-info-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 3px;
      color: #000000;
    }
    .date-col {
      width: 17%;
      text-align: center;
      padding: 6px 4px !important;
    }
    .date-col-label {
      font-size: 8.5px;
      text-transform: uppercase;
      color: #666666;
    }
    .date-col-num {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.05;
      margin: 2px 0;
      color: #000000;
    }
    .date-col-month {
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .date-col-day {
      font-size: 10px;
      font-style: italic;
      color: #222222;
    }
    .date-col-time {
      font-size: 9px;
      color: #555555;
      margin-top: 4px;
    }
    .rooms-col {
      width: 16%;
      text-align: center;
      padding: 6px 4px !important;
    }
    .rooms-col-header {
      font-size: 8.5px;
      color: #666666;
      display: flex;
      justify-content: space-around;
    }
    .rooms-col-val {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      margin: 2px 0;
      color: #000000;
    }
    .group-label {
      font-size: 8px;
      text-transform: uppercase;
      color: #666666;
      margin-top: 2px;
    }
    .group-val {
      font-size: 10.5px;
      font-weight: bold;
    }
    .price-box {
      border: 1px solid #777777;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .price-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 12.5px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .section-subhead {
      font-size: 11.5px;
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 3px;
      color: #000000;
    }
    .room-box {
      border: 1px solid #777777;
      margin-bottom: 12px;
    }
    .room-header {
      padding: 6px 10px;
      font-size: 12.5px;
      font-weight: bold;
      border-bottom: 1px solid #777777;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .room-content-table {
      width: 100%;
      border-collapse: collapse;
    }
    .room-left {
      width: 68%;
      padding: 10px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.38;
      border-right: 1px solid #777777;
    }
    .room-right {
      width: 32%;
      padding: 10px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.4;
    }
    .bottom-boxes-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .bottom-box-left {
      width: 50%;
      border: 1px solid #777777;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.35;
    }
    .bottom-box-right {
      width: 50%;
      border: 1px solid #777777;
      border-left: none;
      padding: 10px 12px;
      vertical-align: top;
      font-size: 10px;
      line-height: 1.35;
    }
    .page-break {
      page-break-before: always;
      padding-top: 15mm;
    }
    .need-help-header {
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .help-link {
      color: #0071c2;
      text-decoration: underline;
      cursor: pointer;
    }
    @media print {
      .print-btn-bar {
        display: none !important;
      }
      body {
        background: #ffffff;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="doc-page">
    <!-- Page 1: Header -->
    <table class="header-table" role="presentation">
      <tr>
        <td style="vertical-align: middle;">
          <div class="logo-text">Booking<span>.com</span></div>
        </td>
        <td class="header-right">
          <div class="confirmation-title">Booking Confirmation</div>
          <div class="conf-num-label">CONFIRMATION NUMBER: <span class="conf-num-val">${escapeHtml(bookingNumber)}</span></div>
          <div class="conf-num-label">PIN CODE: <span class="conf-num-val">${escapeHtml(pinCode)}</span></div>
        </td>
      </tr>
    </table>

    <!-- Top Hotel & Schedule Box -->
    <table class="top-box-table" role="presentation">
      <tr>
        <td class="hotel-info-col">
          <div style="display: flex; gap: 10px;">
            ${hotelImage ? `<img src="${escapeHtml(hotelImage)}" style="width: 76px; height: 76px; object-fit: cover; border: 1px solid #ccc; flex-shrink: 0;" alt="Hotel" />` : ''}
            <div>
              <div class="hotel-info-title">${escapeHtml(hotelName)}</div>
              <div><strong>Address:</strong> ${escapeHtml(hotelAddress)}</div>
              <div><strong>Phone:</strong> ${escapeHtml(hotelPhone)}</div>
              <div><strong>GPS Coordinates:</strong> ${escapeHtml(gpsCoords)}</div>
            </div>
          </div>
        </td>
        <td class="date-col">
          <div class="date-col-label">CHECK-IN</div>
          <div class="date-col-num">${escapeHtml(String(inDayNum))}</div>
          <div class="date-col-month">${escapeHtml(inMonth)}</div>
          <div class="date-col-day">${escapeHtml(inDayName)}</div>
          <div class="date-col-time">🕒 14:00 - 23:30</div>
        </td>
        <td class="date-col">
          <div class="date-col-label">CHECK-OUT</div>
          <div class="date-col-num">${escapeHtml(String(outDayNum))}</div>
          <div class="date-col-month">${escapeHtml(outMonth)}</div>
          <div class="date-col-day">${escapeHtml(outDayName)}</div>
          <div class="date-col-time">🕒 05:00 - 12:00</div>
        </td>
        <td class="rooms-col">
          <div class="rooms-col-header">
            <span>ROOMS</span>
            <span>NIGHTS</span>
          </div>
          <div class="rooms-col-val">1 <span style="font-weight: 300; font-size: 22px;">/</span> ${escapeHtml(String(nights))}</div>
          <div class="group-label">YOUR GROUP</div>
          <div class="group-val">1 adult</div>
        </td>
      </tr>
    </table>

    <!-- PRICE Box -->
    <div class="price-box">
      <div class="price-title-row">
        <span>PRICE</span>
        <span>EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>1 room</span>
        <span>approx. EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row" style="font-size: 13px; font-weight: bold; margin-top: 3px;">
        <span>Subtotal</span>
        <span>approx. EGP ${egpTotal.toLocaleString()}</span>
      </div>
      <div class="price-row" style="color: #444;">
        <span>(for 1 guest)</span>
        <span>${localSymbol}${localSubtotal}</span>
      </div>

      <div style="font-weight: bold; margin-top: 6px; margin-bottom: 2px;">Additional charges</div>
      <div style="color: #333; font-size: 9.5px; margin-bottom: 4px;">
        The price you see below is an approximate that may include fees based on the maximum occupancy. This can include taxes set by local governments or charges set by the property.
      </div>
      <div class="price-row">
        <span>VAT (8.0%)</span>
        <span>EGP ${vatAmount.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>Tourism fee (EGP 127.09 × ${nights} nights)</span>
        <span>EGP ${tourismFee.toLocaleString()}</span>
      </div>
      <div class="price-row">
        <span>Property service charge (15.0%)</span>
        <span>EGP ${serviceCharge.toLocaleString()}</span>
      </div>
      <div class="price-row" style="font-size: 13px; font-weight: bold; margin-top: 6px; border-top: 1px solid #777; padding-top: 4px;">
        <span>Price</span>
        <span>approx. EGP ${grandTotalEgp.toLocaleString()}*</span>
      </div>
      <div style="text-align: right; font-weight: bold; font-size: 12px; margin-top: 2px;">
        You'll pay ${localSymbol}${localPayAmount}.
      </div>
      <div style="font-size: 9px; color: #555; margin-top: 2px;">
        * Tourism Fee (if applicable) refers to the local Tourism Tax
      </div>
      <div style="font-weight: bold; margin-top: 6px;">
        The final price shown is the amount you'll pay to the property.
      </div>
      <div style="font-size: 9.5px; color: #333;">
        Booking.com doesn't charge guests any reservation, administration, or other fees.<br>
        Your card issuer may charge you a foreign transaction fee.
      </div>

      <div class="section-subhead">Payment Info</div>
      <div>${escapeHtml(hotelName)} handles all payments.</div>
      <div>This property accepts the following forms of payment: Cash, Credit Card</div>

      <div class="section-subhead">Currency & Exchange Rate Info</div>
      <div>You'll pay ${escapeHtml(hotelName)} in ${localCurrency} according to the exchange rate on the day of payment.</div>
      <div>The amount displayed in EGP is just an estimate based on today's exchange rate for ${localCurrency}.</div>

      <div class="section-subhead">Additional Info</div>
      <div>Note that additional supplements (e.g. an extra bed) aren't added in this total.</div>
      <div>If you cancel, applicable taxes may still be charged by the property.</div>
      <div>If you don't show up for this booking, and you don't cancel beforehand, the property is liable to charge you the full reservation amount.</div>
      <div>Remember to read the Important info below – it could contain important details not mentioned here.</div>
    </div>

    <!-- Room Details Box -->
    <div class="room-box">
      <div class="room-header">
        <span>${escapeHtml(roomType)}</span>
        <span>🛏️</span>
      </div>
      <table class="room-content-table" role="presentation">
        <tr>
          <td class="room-left">
            <div><strong>Guest name:</strong> ${escapeHtml(clientName)}</div>
            <div><strong>Number of guests:</strong> 1 adult</div>
            <div style="margin-bottom: 4px;"><strong>Meal plan:</strong> ${escapeHtml(boardBasis)}</div>
            <div style="color: #222; margin-bottom: 6px;">
              Private bathroom • Balcony • Garden view • Mountain view • City view • Free toiletries • Shower • Air conditioning • Kitchen • Washing machine • Toilet • Sofa • Towels • Cleaning products • Tile/marble floor • Desk • Soundproofing • TV • Slippers • Refrigerator • Iron • Microwave • Flat-screen TV • Hairdryer • Kitchenware • Kitchenette • Towels/sheets (extra fee) • Wake-up service/Alarm clock • Electric kettle • Dishwasher • Wake-up service • Alarm clock • Wardrobe or closet • Oven • Dining area • Dining table • Clothes rack • Toilet paper • Sofa bed • Carbon monoxide detector • Air purifiers • Hand sanitizer • Single-room AC for guest accommodation
            </div>
            <div><strong>Bed Size(s):</strong> 1 king bed (181-210 cm wide)</div>
          </td>
          <td class="room-right">
            <div><strong>Prepayment :</strong> No prepayment is needed.</div>
            <div style="margin-top: 8px;"><strong>Cancellation cost:</strong></div>
            <div style="color: #008009; font-weight: bold;">from ${escapeHtml(cancellationDateStr)}: ${localCurrency} 0</div>
            <div style="font-size: 9px; color: #555; margin-top: 8px;">Cancellation deadlines are in the property's local time.</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Important Information & Hotel Policies (Bottom of Page 1) -->
    <table class="bottom-boxes-table" role="presentation">
      <tr>
        <td class="bottom-box-left">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>ℹ️</span> <strong>Important Information</strong>
          </div>
          <div>This property does not accommodate bachelor(ette) or similar parties.</div>
          <div style="margin-top: 4px;">
            A damage deposit of ${localCurrency} 100 is required on arrival. That's about EGP ${Math.round(100 * exRateToEgp)}. This will be collected as a cash payment. You should be reimbursed on check-out. Your deposit will be refunded in full, in cash, subject to an inspection of the property.
          </div>
        </td>
        <td class="bottom-box-right">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>📋</span> <strong>Hotel Policies</strong>
          </div>
          <div><strong>Guest parking</strong></div>
          <div>• Private parking is possible on site (reservation is not needed) and costs ${localCurrency} 15 per day.</div>
          <div style="margin-top: 3px;">• WiFi is available in the rooms and is free of charge.</div>
        </td>
      </tr>
    </table>

    <!-- Page 2: Need Help? -->
    <div class="page-break"></div>

    <div style="max-width: 800px; margin: 0 auto; padding-top: 10px; font-size: 11px; line-height: 1.45;">
      <div class="need-help-header">
        <span>⚙️</span>
        <span>Need Help?</span>
      </div>
      <div><strong>You can always view, change or cancel your booking online at:</strong></div>
      <div class="help-link" style="margin-bottom: 6px;">your.booking.com</div>

      <div style="margin-top: 6px;">For any questions related to the property, you can contact ${escapeHtml(hotelName)} directly at: <strong>${escapeHtml(hotelPhone)}</strong></div>

      <div style="margin-top: 8px;"><strong>Or contact us by phone - we're available 24 hours a day:</strong></div>
      <div>Local number: 0800 0000 457</div>
      <div>When abroad or from ${escapeHtml(booking.country || 'abroad')}: +44 20 3320 2643</div>

      <div style="margin-top: 12px; font-weight: bold; color: #003580;">Travel with peace of mind</div>
      <div>Looking for info about traveling safely? The safety resource center can help you prepare for your trip and enjoy a safe, relaxing stay.</div>
      <div class="help-link">See safety resource center</div>

      <div style="margin-top: 8px;">We've gathered the most important local phone numbers to help give you complete peace of mind during your stay in ${escapeHtml(booking.country || 'your destination')}.</div>
      <div class="help-link">See local emergency services</div>
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

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    printWindow.location.href = blobUrl;
  } catch (_) {
    printWindow.document.documentElement.innerHTML = html;
  }
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (_) {}
  }, 60000);
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


