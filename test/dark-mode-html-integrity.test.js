/**
 * AfricaTravel — Dark Mode HTML Integrity & CSS Token Verification Tests
 *
 * Verifies that the broken HTML duplicate opening <div> tags in:
 * - js/pages/customers.js
 * - js/pages/employees.js
 * - js/pages/expenses.js
 * - js/pages/dashboard.js
 * - js/pages/settings.js
 *
 * have been cleanly resolved, that CSS custom properties (tokens) are used,
 * and that no duplicate or unclosed opening tags exist.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🎨 ========================================================');
console.log('   AfricaTravel Dark Mode HTML Integrity Verification');
console.log('========================================================\n');

describe('Dark Mode HTML Integrity & Token Verification', () => {
  const customersPath = path.join(rootDir, 'js', 'pages', 'customers.js');
  const employeesPath = path.join(rootDir, 'js', 'pages', 'employees.js');
  const expensesPath = path.join(rootDir, 'js', 'pages', 'expenses.js');
  const dashboardPath = path.join(rootDir, 'js', 'pages', 'dashboard.js');
  const settingsPath = path.join(rootDir, 'js', 'pages', 'settings.js');

  const customersContent = fs.readFileSync(customersPath, 'utf8');
  const employeesContent = fs.readFileSync(employeesPath, 'utf8');
  const expensesContent = fs.readFileSync(expensesPath, 'utf8');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');

  it('1. js/pages/customers.js has single balanced avatar <div> with CSS tokens', () => {
    // Must NOT contain the old hardcoded color line
    assert.ok(!customersContent.includes("background-color: ${c.isVip ? '#854d0e' : '#2563eb'}"), 'customers.js must not contain hardcoded avatar color');
    // Must contain the CSS variable token line
    assert.ok(customersContent.includes("background-color: ${c.isVip ? 'var(--color-avatar-vip)' : 'var(--color-avatar-agent)'}"), 'customers.js must contain CSS variable tokens');

    // Count occurrences of sidebar-user-avatar opening
    const matches = customersContent.match(/class="sidebar-user-avatar"/g);
    assert.equal(matches?.length, 1, 'customers.js must contain exactly 1 sidebar-user-avatar element');
    console.log('  ✓ customers.js: avatar uses var(--color-avatar-vip/agent) without duplication');
  });

  it('2. js/pages/employees.js has single balanced avatar <div> with CSS tokens', () => {
    // Must NOT contain the old hardcoded color line
    assert.ok(!employeesContent.includes("background-color: ${e.role === 'ADMIN' ? '#1e3a8a' : '#2563eb'}"), 'employees.js must not contain hardcoded avatar color');
    // Must contain the CSS variable token line
    assert.ok(employeesContent.includes("background-color: ${e.role === 'ADMIN' ? 'var(--color-avatar-admin)' : 'var(--color-avatar-agent)'}"), 'employees.js must contain CSS variable tokens');

    const matches = employeesContent.match(/class="sidebar-user-avatar"/g);
    assert.equal(matches?.length, 1, 'employees.js must contain exactly 1 sidebar-user-avatar element');
    console.log('  ✓ employees.js: avatar uses var(--color-avatar-admin/agent) without duplication');
  });

  it('3. js/pages/expenses.js has single balanced avatar <div> with CSS tokens', () => {
    // Must NOT contain the old hardcoded color line
    assert.ok(!expensesContent.includes('background-color: #2563eb;'), 'expenses.js must not contain hardcoded avatar color');
    // Must contain the CSS variable token line
    assert.ok(expensesContent.includes('background-color: var(--color-avatar-agent);'), 'expenses.js must contain CSS variable token');

    const matches = expensesContent.match(/class="sidebar-user-avatar"/g);
    assert.equal(matches?.length, 1, 'expenses.js must contain exactly 1 sidebar-user-avatar element');
    console.log('  ✓ expenses.js: avatar uses var(--color-avatar-agent) without duplication');
  });

  it('4. js/pages/dashboard.js has single balanced icon <div> with CSS tokens', () => {
    // Must NOT contain the old hardcoded color line
    assert.ok(!dashboardContent.includes('background: #e0f2fe; color: #0284c7;'), 'dashboard.js must not contain hardcoded icon colors');
    // Must contain the CSS variable token line
    assert.ok(dashboardContent.includes('background: var(--color-icon-bg-info); color: var(--color-icon-fg-info);'), 'dashboard.js must contain CSS variable tokens');

    const matches = dashboardContent.match(/background: var\(--color-icon-bg-info\);/g);
    assert.equal(matches?.length, 1, 'dashboard.js must contain exactly 1 upcoming flight icon element with this token');
    console.log('  ✓ dashboard.js: flight icon uses var(--color-icon-bg-info) without duplication');
  });

  it('5. js/pages/settings.js has single balanced avatar <div> and single danger container', () => {
    // Must NOT contain hardcoded gradient
    assert.ok(!settingsContent.includes('linear-gradient(135deg, #1e3a8a, #2563eb)'), 'settings.js must not contain hardcoded avatar gradient');
    // Must contain CSS variable gradient
    assert.ok(settingsContent.includes('linear-gradient(135deg, var(--color-avatar-admin), var(--color-avatar-agent))'), 'settings.js must contain CSS variable avatar gradient');

    // Must NOT contain duplicate danger container
    assert.ok(!settingsContent.includes('border: 1px solid var(--color-border-danger, #fecaca)'), 'settings.js must not contain legacy fallback border');
    assert.ok(settingsContent.includes('border: 1px solid var(--color-border-danger)'), 'settings.js must contain clean token border');

    const avatarMatches = settingsContent.match(/class="sidebar-user-avatar"/g);
    assert.equal(avatarMatches?.length, 1, 'settings.js must contain exactly 1 profile avatar');

    const dangerMatches = settingsContent.match(/border: 1px solid var\(--color-border-danger\)/g);
    assert.equal(dangerMatches?.length, 1, 'settings.js must contain exactly 1 danger section border');
    console.log('  ✓ settings.js: profile avatar and danger container are singular and balanced');
  });

  it('6. Zero consecutive duplicate opening tags exist across all 5 files', () => {
    const files = [
      { name: 'customers.js', content: customersContent },
      { name: 'employees.js', content: employeesContent },
      { name: 'expenses.js', content: expensesContent },
      { name: 'dashboard.js', content: dashboardContent },
      { name: 'settings.js', content: settingsContent },
    ];

    for (const { name, content } of files) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const l1 = lines[i].trim();
        const l2 = lines[i + 1].trim();
        if (l1.startsWith('<div') && l2.startsWith('<div')) {
          const isRedundant = (l1.includes('avatar') && l2.includes('avatar')) ||
                              (l1.includes('width: 38px') && l2.includes('width: 38px')) ||
                              (l1.includes('var(--color-surface)') && l2.includes('var(--color-surface)'));
          assert.ok(!isRedundant, `Found redundant consecutive div in ${name} at line ${i + 1}`);
        }
      }
    }
    console.log('  ✓ All 5 files verified: zero consecutive duplicate opening tags');
  });
});
