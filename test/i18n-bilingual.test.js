/**
 * AfricaTravel — Bilingual LTR & RTL Unit Test Suite
 */

import assert from 'node:assert';
import { i18n, t, has, getUserRoleLabel } from '../js/i18n/i18n.js';
import { en } from '../js/i18n/locales/en.js';
import { ar } from '../js/i18n/locales/ar.js';
import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatRelativeTime
} from '../js/utils/calculations.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n═══ 1. Language Initialization & Direction Tests ═══');

test('i18n initializes with valid language (en or ar)', () => {
  const lang = i18n.getLanguage();
  assert(lang === 'en' || lang === 'ar', `Language was ${lang}`);
});

test('i18n defaults to ltr for en and rtl for ar', () => {
  i18n.setLanguage('en');
  assert.strictEqual(i18n.getDirection(), 'ltr');
  assert.strictEqual(i18n.isRTL(), false);

  i18n.setLanguage('ar');
  assert.strictEqual(i18n.getDirection(), 'rtl');
  assert.strictEqual(i18n.isRTL(), true);
});

test('i18n toggle switches between en and ar', () => {
  i18n.setLanguage('en');
  assert.strictEqual(i18n.getLanguage(), 'en');
  const next1 = i18n.toggleLanguage();
  assert.strictEqual(next1, 'ar');
  assert.strictEqual(i18n.getLanguage(), 'ar');
  const next2 = i18n.toggleLanguage();
  assert.strictEqual(next2, 'en');
  assert.strictEqual(i18n.getLanguage(), 'en');
});

console.log('\n═══ 2. Navigation & Page Title Translations ═══');

test('Navigation keys translated properly in English', () => {
  i18n.setLanguage('en');
  assert.strictEqual(t('nav.dashboard'), 'Dashboard');
  assert.strictEqual(t('nav.tickets'), 'Tickets');
  assert.strictEqual(t('nav.customers'), 'Customers');
  assert.strictEqual(t('nav.payments'), 'Payments');
  assert.strictEqual(t('nav.refunds'), 'Refunds');
  assert.strictEqual(t('nav.reports'), 'Reports');
  assert.strictEqual(t('nav.employees'), 'Employees');
  assert.strictEqual(t('nav.activity'), 'Activity Log');
  assert.strictEqual(t('nav.settings'), 'Settings');
  assert.strictEqual(t('nav.newTicket'), 'New Ticket');
});

test('Navigation keys translated properly in Arabic', () => {
  i18n.setLanguage('ar');
  assert.strictEqual(t('nav.dashboard'), 'لوحة التحكم');
  assert.strictEqual(t('nav.tickets'), 'التذاكر');
  assert.strictEqual(t('nav.customers'), 'العملاء');
  assert.strictEqual(t('nav.payments'), 'المدفوعات');
  assert.strictEqual(t('nav.refunds'), 'الاستردادات');
  assert.strictEqual(t('nav.reports'), 'التقارير');
  assert.strictEqual(t('nav.employees'), 'الموظفون');
  assert.strictEqual(t('nav.activity'), 'سجل النشاط');
  assert.strictEqual(t('nav.settings'), 'الإعدادات');
  assert.strictEqual(t('nav.more'), 'المزيد');
});

console.log('\n═══ 3. Status Translation Tests ═══');

test('All core statuses translated in English', () => {
  i18n.setLanguage('en');
  assert.strictEqual(i18n.translateStatus('CONFIRMED'), 'CONFIRMED');
  assert.strictEqual(i18n.translateStatus('PAID'), 'PAID');
  assert.strictEqual(i18n.translateStatus('PARTIALLY PAID'), 'PARTIALLY PAID');
  assert.strictEqual(i18n.translateStatus('UNPAID'), 'UNPAID');
  assert.strictEqual(i18n.translateStatus('MODIFIED'), 'MODIFIED');
  assert.strictEqual(i18n.translateStatus('REFUND REQUESTED'), 'REFUND REQUESTED');
  assert.strictEqual(i18n.translateStatus('REFUNDED'), 'REFUNDED');
  assert.strictEqual(i18n.translateStatus('CANCELLED'), 'CANCELLED');
  assert.strictEqual(i18n.translateStatus('COMPLETED'), 'COMPLETED');
  assert.strictEqual(i18n.translateStatus('BOOKED'), 'BOOKED');
});

test('All core statuses translated accurately in Arabic', () => {
  i18n.setLanguage('ar');
  assert.strictEqual(i18n.translateStatus('CONFIRMED'), 'مؤكدة');
  assert.strictEqual(i18n.translateStatus('PAID'), 'مدفوعة');
  assert.strictEqual(i18n.translateStatus('PARTIALLY PAID'), 'مدفوعة جزئيًا');
  assert.strictEqual(i18n.translateStatus('UNPAID'), 'غير مدفوعة');
  assert.strictEqual(i18n.translateStatus('MODIFIED'), 'معدلة');
  assert.strictEqual(i18n.translateStatus('REFUND REQUESTED'), 'طلب استرداد');
  assert.strictEqual(i18n.translateStatus('REFUNDED'), 'مستردة');
  assert.strictEqual(i18n.translateStatus('CANCELLED'), 'ملغاة');
  assert.strictEqual(i18n.translateStatus('COMPLETED'), 'مكتملة');
  assert.strictEqual(i18n.translateStatus('BOOKED'), 'محجوزة');
});

console.log('\n═══ 4. Validation & Toast Translations ═══');

test('Validation messages translated in Arabic and English', () => {
  i18n.setLanguage('en');
  assert.strictEqual(t('validation.paymentExceedsRemaining'), 'Payment exceeds the remaining balance.');
  assert.strictEqual(t('validation.refundExceedsAvailable'), 'Refund exceeds the available refundable amount.');
  assert.strictEqual(t('validation.invalidFlightSchedule'), 'Invalid flight schedule.');
  assert.strictEqual(t('validation.requiredField'), 'Required field.');

  i18n.setLanguage('ar');
  assert.strictEqual(t('validation.paymentExceedsRemaining'), 'قيمة الدفعة تتجاوز الرصيد المتبقي.');
  assert.strictEqual(t('validation.refundExceedsAvailable'), 'قيمة الاسترداد تتجاوز المبلغ المتاح للاسترداد.');
  assert.strictEqual(t('validation.invalidFlightSchedule'), 'بيانات مواعيد الرحلة غير صحيحة.');
  assert.strictEqual(t('validation.requiredField'), 'هذا الحقل مطلوب.');
});

test('Toast messages translated in Arabic and English', () => {
  i18n.setLanguage('en');
  assert.strictEqual(t('toasts.ticketCreated'), 'Ticket created successfully.');
  assert.strictEqual(t('toasts.paymentAdded'), 'Payment added successfully.');
  assert.strictEqual(t('toasts.flightModified'), 'Flight modification saved.');
  assert.strictEqual(t('toasts.refundCreated'), 'Refund request created.');
  assert.strictEqual(t('toasts.customerUpdated'), 'Customer updated successfully.');

  i18n.setLanguage('ar');
  assert.strictEqual(t('toasts.ticketCreated'), 'تم إنشاء التذكرة بنجاح.');
  assert.strictEqual(t('toasts.paymentAdded'), 'تمت إضافة الدفعة بنجاح.');
  assert.strictEqual(t('toasts.flightModified'), 'تم حفظ تعديل الرحلة.');
  assert.strictEqual(t('toasts.refundCreated'), 'تم إنشاء طلب الاسترداد.');
  assert.strictEqual(t('toasts.customerUpdated'), 'تم تحديث بيانات العميل بنجاح.');
});

console.log('\n═══ 5. Number & Currency Formatting Tests ═══');

test('Currency formatted with EGP in English', () => {
  i18n.setLanguage('en');
  assert.strictEqual(formatCurrency(18500, 'EGP'), '18,500 EGP');
  assert.strictEqual(formatCurrency(0, 'EGP'), '0 EGP');
  assert.strictEqual(formatCurrency(1250.5, 'EGP'), '1,250.5 EGP');
});

test('Currency formatted with جنيه مصري in Arabic', () => {
  i18n.setLanguage('ar');
  assert.strictEqual(formatCurrency(18500, 'EGP'), '18,500 جنيه مصري');
  assert.strictEqual(formatCurrency(0, 'EGP'), '0 جنيه مصري');
  assert.strictEqual(formatCurrency(1250.5, 'EGP'), '1,250.5 جنيه مصري');
});

test('Compact number formatted in both locales', () => {
  assert.strictEqual(formatCompactNumber(1250000), '1.25M');
  assert.strictEqual(formatCompactNumber(980000), '980K');
  assert.strictEqual(formatCompactNumber(248), '248');
});

console.log('\n═══ 6. Date & Time Formatting Tests ═══');

test('Date formatted properly in English and Arabic', () => {
  const d = new Date('2024-10-24T14:30:00Z');
  i18n.setLanguage('en');
  const enDate = formatDate(d);
  assert(enDate.includes('24') && enDate.includes('2024'), `enDate was ${enDate}`);

  i18n.setLanguage('ar');
  const arDate = formatDate(d);
  assert(arDate.includes('24') && arDate.includes('2024'), `arDate was ${arDate}`);
});

test('Date & Time formatted properly in English and Arabic', () => {
  const d = new Date('2024-10-24T14:30:00');
  i18n.setLanguage('en');
  const enDateTime = formatDateTime(d);
  assert(enDateTime.includes('24') && enDateTime.includes(':'), `enDateTime was ${enDateTime}`);

  i18n.setLanguage('ar');
  const arDateTime = formatDateTime(d);
  assert(arDateTime.includes('24') && arDateTime.includes(':'), `arDateTime was ${arDateTime}`);
});

test('Relative time formatted in English and Arabic', () => {
  const justNow = new Date();
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

  i18n.setLanguage('en');
  assert.strictEqual(formatRelativeTime(justNow), 'Just now');
  assert.strictEqual(formatRelativeTime(fiveMinsAgo), '5 mins ago');

  i18n.setLanguage('ar');
  assert.strictEqual(formatRelativeTime(justNow), 'الآن');
  assert.strictEqual(formatRelativeTime(fiveMinsAgo), 'منذ 5 دقيقة');
});

console.log('\n═══ 7. Fallback & Safe Interpolation Tests ═══');

test('Interpolation replaces placeholder tokens', () => {
  i18n.setLanguage('en');
  assert.strictEqual(t('time.minsAgo', { n: 10 }), '10 mins ago');

  i18n.setLanguage('ar');
  assert.strictEqual(t('time.minsAgo', { n: 10 }), 'منذ 10 دقيقة');
});

test('Fallback returns key if key is missing entirely and no fallback provided', () => {
  assert.strictEqual(t('nonexistent.nested.key'), 'nonexistent.nested.key');
});

test('has() correctly identifies present and missing keys', () => {
  i18n.setLanguage('en');
  assert.strictEqual(has('nav.dashboard'), true);
  assert.strictEqual(has('roles.ADMIN'), true);
  assert.strictEqual(has('roles.Ticketing Officer'), false);
  assert.strictEqual(has('nonexistent.key'), false);

  i18n.setLanguage('ar');
  assert.strictEqual(has('nav.dashboard'), true);
  assert.strictEqual(has('roles.ADMIN'), true);
  assert.strictEqual(has('roles.Ticketing Officer'), false);
  assert.strictEqual(has('nonexistent.key'), false);
});

test('t() returns explicit fallback when key is missing', () => {
  i18n.setLanguage('en');
  assert.strictEqual(t('roles.Ticketing Officer', 'Ticketing Officer'), 'Ticketing Officer');
  assert.strictEqual(t('roles.Ticketing Officer', {}, 'Fallback Title'), 'Fallback Title');
  assert.strictEqual(t('nav.dashboard', 'Fallback'), 'Dashboard');

  i18n.setLanguage('ar');
  assert.strictEqual(t('roles.Ticketing Officer', 'Ticketing Officer'), 'Ticketing Officer');
  assert.strictEqual(t('nav.dashboard', 'Fallback'), 'لوحة التحكم');
});

console.log('\n═══ 8. User Role & Custom Title Label Tests ═══');

test('getUserRoleLabel handles enum roles in English and Arabic', () => {
  i18n.setLanguage('en');
  assert.strictEqual(getUserRoleLabel({ role: 'ADMIN' }), 'Administrator');
  assert.strictEqual(getUserRoleLabel({ role: 'AGENT' }), 'Ticketing Agent');
  assert.strictEqual(getUserRoleLabel({ role: 'TICKET_ONLY' }), 'Ticket Creation Only');

  i18n.setLanguage('ar');
  assert.strictEqual(getUserRoleLabel({ role: 'ADMIN' }), 'مسؤول النظام');
  assert.strictEqual(getUserRoleLabel({ role: 'AGENT' }), 'وكيل حجز تذاكر');
  assert.strictEqual(getUserRoleLabel({ role: 'TICKET_ONLY' }), 'إنشاء تذاكر فقط');
});

test('getUserRoleLabel translates known title (Senior Operations Director)', () => {
  i18n.setLanguage('en');
  assert.strictEqual(getUserRoleLabel({ title: 'Senior Operations Director' }), 'Senior Operations Director');

  i18n.setLanguage('ar');
  assert.strictEqual(getUserRoleLabel({ title: 'Senior Operations Director' }), 'مدير أول العمليات');
});

test('getUserRoleLabel handles free-text custom titles without leaking raw i18n keys', () => {
  const customEmployee = {
    name: 'Sarah Connor',
    role: 'AGENT',
    title: 'Ticketing Officer'
  };

  i18n.setLanguage('en');
  const enRole = getUserRoleLabel(customEmployee);
  assert.strictEqual(enRole, 'Ticketing Officer');
  assert(!enRole.startsWith('roles.'), 'Should never return raw roles. prefix');

  i18n.setLanguage('ar');
  const arRole = getUserRoleLabel(customEmployee);
  assert.strictEqual(arRole, 'Ticketing Officer');
  assert(!arRole.startsWith('roles.'), 'Should never return raw roles. prefix in Arabic');

  // Test another custom title
  const refundsSpecialist = {
    name: 'Ahmed Ali',
    role: 'AGENT',
    title: 'Refunds Specialist'
  };
  assert.strictEqual(getUserRoleLabel(refundsSpecialist), 'Refunds Specialist');
});

console.log('\n══════════════════════════════════════');
console.log(`  Bilingual i18n Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
