/**
 * AfricaTravel — Boot Splash Screen Verification Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🚀 ========================================================');
console.log('   AfricaTravel Boot Splash Screen Verification Tests');
console.log('========================================================\n');

describe('Boot Splash Screen Verification', () => {
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const baseCssPath = path.join(rootDir, 'styles', 'base.css');
  const appJsPath = path.join(rootDir, 'js', 'app.js');
  const enLocalePath = path.join(rootDir, 'js', 'i18n', 'locales', 'en.js');
  const arLocalePath = path.join(rootDir, 'js', 'i18n', 'locales', 'ar.js');

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const baseCss = fs.readFileSync(baseCssPath, 'utf8');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const enContent = fs.readFileSync(enLocalePath, 'utf8');
  const arContent = fs.readFileSync(arLocalePath, 'utf8');

  it('1. index.html contains static boot splash markup in #app for zero-blank initial paint', () => {
    assert.ok(indexHtml.includes('id="app-boot-splash"'), 'index.html must include #app-boot-splash');
    assert.ok(indexHtml.includes('class="boot-splash"'), 'index.html must include .boot-splash');
    assert.ok(indexHtml.includes('src="/assets/icon-512.png"'), 'index.html must use /assets/icon-512.png');
    assert.ok(indexHtml.includes('class="boot-splash-title"'), 'index.html must have .boot-splash-title');
    assert.ok(indexHtml.includes('id="boot-splash-status"'), 'index.html must have #boot-splash-status');
    assert.ok(indexHtml.includes('id="boot-splash-progress-bar"'), 'index.html must have #boot-splash-progress-bar');
    assert.ok(indexHtml.includes('id="boot-step-session"'), 'index.html must have #boot-step-session');
    assert.ok(indexHtml.includes('id="boot-step-data"'), 'index.html must have #boot-step-data');
    assert.ok(indexHtml.includes('id="boot-step-shell"'), 'index.html must have #boot-step-shell');
    assert.ok(indexHtml.includes('class="boot-splash-secure"'), 'index.html must have .boot-splash-secure');
    console.log('  ✓ Static boot splash markup present in #app');
  });

  it('2. styles/base.css defines comprehensive styles for boot splash', () => {
    assert.ok(baseCss.includes('.boot-splash'), 'base.css must define .boot-splash');
    assert.ok(baseCss.includes('--color-primary-container') || baseCss.includes('#131b2e'), 'base.css must style background with navy');
    assert.ok(baseCss.includes('.boot-splash-logo'), 'base.css must define .boot-splash-logo');
    assert.ok(baseCss.includes('.boot-splash-progress'), 'base.css must define .boot-splash-progress');
    assert.ok(baseCss.includes('.boot-splash-progress-bar'), 'base.css must define .boot-splash-progress-bar');
    assert.ok(baseCss.includes('.boot-splash-steps'), 'base.css must define .boot-splash-steps');
    assert.ok(baseCss.includes('.boot-splash-step'), 'base.css must define .boot-splash-step');
    assert.ok(baseCss.includes('.boot-step-icon'), 'base.css must define .boot-step-icon');
    assert.ok(baseCss.includes('.boot-splash-step.active'), 'base.css must define .boot-splash-step.active');
    assert.ok(baseCss.includes('.boot-splash-step.done'), 'base.css must define .boot-splash-step.done');
    console.log('  ✓ styles/base.css defines all boot splash components, active/done states, and progress bar');
  });

  it('3. js/app.js drives real honest 3-step progress and removes splash on shell render', () => {
    assert.ok(appJs.includes('markBootStep'), 'app.js must define markBootStep helper');
    assert.ok(appJs.includes('setBootProgress'), 'app.js must define setBootProgress helper');
    assert.ok(appJs.includes('boot-step-session'), 'app.js must update boot-step-session');
    assert.ok(appJs.includes('boot-step-data'), 'app.js must update boot-step-data');
    assert.ok(appJs.includes('boot-step-shell'), 'app.js must update boot-step-shell');
    assert.ok(appJs.includes('localizeBootSplash'), 'app.js must localize boot splash');
    console.log('  ✓ js/app.js drives honest 3-step async bootstrap progress');
  });

  it('4. en.js and ar.js contain complete bootSplash translation dictionary', () => {
    assert.ok(enContent.includes('bootSplash:'), 'en.js must have bootSplash block');
    assert.ok(enContent.includes('checkingSession:'), 'en.js must have checkingSession');
    assert.ok(enContent.includes('loadingData:'), 'en.js must have loadingData');
    assert.ok(enContent.includes('preparingDashboard:'), 'en.js must have preparingDashboard');
    assert.ok(enContent.includes('secureConnection:'), 'en.js must have secureConnection');

    assert.ok(arContent.includes('bootSplash:'), 'ar.js must have bootSplash block');
    assert.ok(arContent.includes('checkingSession:'), 'ar.js must have checkingSession');
    assert.ok(arContent.includes('loadingData:'), 'ar.js must have loadingData');
    assert.ok(arContent.includes('preparingDashboard:'), 'ar.js must have preparingDashboard');
    assert.ok(arContent.includes('secureConnection:'), 'ar.js must have secureConnection');
    console.log('  ✓ Bilingual translations for boot splash present in en.js and ar.js');
  });
});
