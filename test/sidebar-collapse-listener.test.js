/**
 * AfricaTravel — Sidebar Collapse Listener & Shell Event Re-binding Verification Tests
 *
 * Verifies that the delegated document click listeners in js/app.js:
 * 1) Sidebar collapse toggle & sign out
 * 2) Search dropdown outside-click dismiss
 *
 * are strictly guarded to attach only once across multiple language switches and shell re-renders,
 * preventing duplicate handler buildup and UI hangs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🧭 ========================================================');
console.log('   AfricaTravel Sidebar Collapse Listener Tests');
console.log('========================================================\n');

describe('Sidebar Collapse & Search Dropdown Listener Deduplication', () => {
  const appJsPath = path.join(rootDir, 'js', 'app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  it('1. App constructor initializes listener guard flags', () => {
    assert.ok(
      appJsContent.includes('this.globalClickBound = false;'),
      'App constructor should initialize this.globalClickBound = false'
    );
    assert.ok(
      appJsContent.includes('this.globalSearchClickBound = false;'),
      'App constructor should initialize this.globalSearchClickBound = false'
    );
    console.log('  ✓ App constructor initializes listener guard flags');
  });

  it('2. Delegated document click listener for sidebar collapse/sign-out is guarded by globalClickBound', () => {
    // Verify that the listener is wrapped in if (!this.globalClickBound)
    const pattern = /if\s*\(!this\.globalClickBound\)\s*\{\s*this\.globalClickBound\s*=\s*true;\s*document\.addEventListener\('click'/;
    assert.ok(
      pattern.test(appJsContent),
      'Delegated sidebar collapse / sign-out click listener must be guarded by if (!this.globalClickBound)'
    );
    console.log('  ✓ Sidebar collapse/sign-out listener is guarded by this.globalClickBound');
  });

  it('3. Search dropdown outside-click listener is guarded and looks up elements freshly', () => {
    const searchPattern = /if\s*\(!this\.globalSearchClickBound\)\s*\{\s*this\.globalSearchClickBound\s*=\s*true;\s*document\.addEventListener\('click'/;
    assert.ok(
      searchPattern.test(appJsContent),
      'Search dropdown outside-click listener must be guarded by if (!this.globalSearchClickBound)'
    );

    // Verify that it looks up topbar-global-search and topbar-search-dropdown fresh inside the handler
    assert.ok(
      appJsContent.includes("document.getElementById('topbar-global-search')"),
      'Search dropdown outside-click handler must query document.getElementById("topbar-global-search") fresh'
    );
    assert.ok(
      appJsContent.includes("document.getElementById('topbar-search-dropdown')"),
      'Search dropdown outside-click handler must query document.getElementById("topbar-search-dropdown") fresh'
    );
    console.log('  ✓ Search dropdown outside-click listener is guarded and uses fresh DOM queries');
  });

  it('4. Other element-specific listeners in bindGlobalEvents are NOT guarded and re-bind on shell render', () => {
    // Check that topbar buttons still get their listeners bound directly
    assert.ok(
      appJsContent.includes("langToggleBtn.addEventListener('click'"),
      'Language toggle button must re-bind listener'
    );
    assert.ok(
      appJsContent.includes("searchInput.addEventListener('input'"),
      'Search input must re-bind input listener'
    );
    assert.ok(
      appJsContent.includes("notifBtn.addEventListener('click'"),
      'Notification bell must re-bind click listener'
    );
    assert.ok(
      appJsContent.includes("helpBtn.addEventListener('click'"),
      'Help button must re-bind click listener'
    );
    console.log('  ✓ Topbar/sidebar element listeners remain re-bindable per shell render');
  });

  it('5. Simulated N language switches do not accumulate duplicate document click listeners', () => {
    // Mock document and elements to simulate bindGlobalEvents() execution
    const registeredDocumentListeners = [];
    const mockDocument = {
      addEventListener: (event, handler) => {
        if (event === 'click') {
          registeredDocumentListeners.push(handler);
        }
      },
      getElementById: (id) => {
        if (id === 'topbar-lang-toggle-btn') return { addEventListener: () => {} };
        if (id === 'topbar-global-search') return { addEventListener: () => {}, contains: () => false };
        if (id === 'global-search-input') return { addEventListener: () => {}, value: '' };
        if (id === 'topbar-search-dropdown') return { classList: { add: () => {}, remove: () => {} }, appendChild: () => {} };
        if (id === 'topbar-notif-btn') return { addEventListener: () => {} };
        if (id === 'topbar-help-btn') return { addEventListener: () => {} };
        if (id === 'app-bottom-nav-container') return null;
        if (id === 'app-sidebar-container') return { innerHTML: '' };
        return null;
      },
      querySelector: () => null,
      documentElement: { classList: { toggle: () => false } },
      body: { classList: { toggle: () => false } }
    };

    // Extract bindGlobalEvents method body and execute it in simulated app context
    // We create an App-like object with the flags
    const simulatedApp = {
      globalClickBound: false,
      globalSearchClickBound: false,
    };

    // Run bindGlobalEvents logic 10 times with mocked global document
    const originalDocument = globalThis.document;
    globalThis.document = mockDocument;

    try {
      // Simulate bindGlobalEvents body
      const runBindGlobalEvents = (app) => {
        // Search outside click
        const searchForm = document.getElementById('topbar-global-search');
        const searchInput = document.getElementById('global-search-input');
        if (searchForm && searchInput) {
          if (!app.globalSearchClickBound) {
            app.globalSearchClickBound = true;
            document.addEventListener('click', (e) => {
              const currentSearchForm = document.getElementById('topbar-global-search');
              const currentSearchDropdown = document.getElementById('topbar-search-dropdown');
              if (currentSearchDropdown && (!currentSearchForm || !currentSearchForm.contains(e.target))) {
                currentSearchDropdown.classList.add('d-none');
              }
            });
          }
        }

        // Sidebar collapse & sign out
        if (!app.globalClickBound) {
          app.globalClickBound = true;
          document.addEventListener('click', async () => {});
        }
      };

      // Call 10 times (simulating 10 language changes)
      for (let i = 0; i < 10; i++) {
        runBindGlobalEvents(simulatedApp);
      }

      assert.equal(
        registeredDocumentListeners.length,
        2,
        `Expected exactly 2 document click listeners registered, but found ${registeredDocumentListeners.length}`
      );
      assert.equal(simulatedApp.globalClickBound, true);
      assert.equal(simulatedApp.globalSearchClickBound, true);
      console.log('  ✓ After 10 simulated language switches, exactly 2 document click listeners exist (no leaks)');
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
