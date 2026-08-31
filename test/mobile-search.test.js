/**
 * AfricaTravel — Mobile Topbar Search Verification Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🔍 ========================================================');
console.log('   AfricaTravel Mobile Topbar Search Verification Tests');
console.log('========================================================\n');

describe('Mobile Topbar Search Verification', () => {
  const topbarJsPath = path.join(rootDir, 'js', 'components', 'topbar.js');
  const appJsPath = path.join(rootDir, 'js', 'app.js');
  const responsiveCssPath = path.join(rootDir, 'styles', 'responsive.css');
  const layoutCssPath = path.join(rootDir, 'styles', 'layout.css');
  const enLocalePath = path.join(rootDir, 'js', 'i18n', 'locales', 'en.js');
  const arLocalePath = path.join(rootDir, 'js', 'i18n', 'locales', 'ar.js');

  const topbarContent = fs.readFileSync(topbarJsPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const responsiveCssContent = fs.readFileSync(responsiveCssPath, 'utf8');
  const layoutCssContent = fs.readFileSync(layoutCssPath, 'utf8');
  const enContent = fs.readFileSync(enLocalePath, 'utf8');
  const arContent = fs.readFileSync(arLocalePath, 'utf8');

  it('1. topbar.js renders mobile search trigger button (#topbar-mobile-search-btn)', () => {
    assert.ok(topbarContent.includes('id="topbar-mobile-search-btn"'), 'topbar.js should include #topbar-mobile-search-btn');
    assert.ok(topbarContent.includes('topbar-mobile-search-btn'), 'topbar.js should include class topbar-mobile-search-btn');
    assert.ok(topbarContent.includes('show-mobile'), 'topbar search button should have show-mobile class');
    console.log('  ✓ Topbar renders mobile search button with #topbar-mobile-search-btn');
  });

  it('2. topbar.js renders close button inside search form (#topbar-search-close-btn)', () => {
    assert.ok(topbarContent.includes('id="topbar-search-close-btn"'), 'topbar.js should include #topbar-search-close-btn');
    assert.ok(topbarContent.includes('topbar-search-close-btn'), 'topbar.js should include class topbar-search-close-btn');
    console.log('  ✓ Topbar renders close button with #topbar-search-close-btn');
  });

  it('3. styles/responsive.css styles mobile-search-active overlay and mobile-search-open', () => {
    assert.ok(responsiveCssContent.includes('.topbar-search-form.mobile-search-active'), 'responsive.css should style .topbar-search-form.mobile-search-active');
    assert.ok(responsiveCssContent.includes('position: absolute'), 'mobile search active should be position: absolute');
    assert.ok(responsiveCssContent.includes('.app-topbar.mobile-search-open'), 'responsive.css should handle .app-topbar.mobile-search-open');
    assert.ok(responsiveCssContent.includes('.topbar-mobile-search-btn'), 'responsive.css should display mobile search btn');
    console.log('  ✓ responsive.css defines full-width mobile overlay and hiding of sibling buttons');
  });

  it('4. styles/layout.css defines base styles for topbar-search-close-btn', () => {
    assert.ok(layoutCssContent.includes('.topbar-search-close-btn'), 'layout.css should define .topbar-search-close-btn');
    console.log('  ✓ layout.css defines .topbar-search-close-btn');
  });

  it('5. js/app.js binds mobile search open and close event handlers', () => {
    assert.ok(appJsContent.includes('topbar-mobile-search-btn'), 'app.js should query #topbar-mobile-search-btn');
    assert.ok(appJsContent.includes('topbar-search-close-btn'), 'app.js should query #topbar-search-close-btn');
    assert.ok(appJsContent.includes('mobile-search-active'), 'app.js should toggle mobile-search-active class');
    assert.ok(appJsContent.includes('mobile-search-open'), 'app.js should toggle mobile-search-open class');
    console.log('  ✓ app.js wires open/close/cleanup behavior for mobile search');
  });

  it('6. Bilingual translations include closeSearch', () => {
    assert.ok(enContent.includes('closeSearch:'), 'en.js should have closeSearch translation');
    assert.ok(arContent.includes('closeSearch:'), 'ar.js should have closeSearch translation');
    console.log('  ✓ EN and AR locales define closeSearch key');
  });
});
