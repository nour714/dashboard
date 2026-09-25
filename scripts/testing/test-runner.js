#!/usr/bin/env node
/**
 * AfricaTravel — Consolidated Test Suite Runner
 *
 * Runs test suites systematically with structured progress indicators,
 * elapsed execution timings, error aggregation, and suite filtering.
 *
 * Usage:
 *   node scripts/testing/test-runner.js              # Run all 35+ test files
 *   node scripts/testing/test-runner.js --unit       # Run unit tests only
 *   node scripts/testing/test-runner.js --integration# Run integration tests only
 *   node scripts/testing/test-runner.js --security   # Run security tests only
 *   node scripts/testing/test-runner.js --bail       # Stop immediately on first failure
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const UNIT_TESTS = [
  'tests/unit/ledger-domain.test.js',
  'tests/unit/financial-audit-scenarios.test.js',
  'tests/unit/backend-domain.test.js',
  'tests/unit/ticket-payment-status.test.js',
  'tests/unit/sidebar-collapse-listener.test.js',
  'tests/unit/schema-bounds.test.js',
  'tests/unit/ticket-schema-nullables.test.js',
  'tests/unit/flight-modification-fee-split.test.js',
  'tests/unit/dark-mode-html-integrity.test.js',
  'tests/unit/db-transient-retry.test.js',
  'tests/unit/migrate-if-production.test.js',
  // Frontend unit tests run using node built-in test runner
  { file: 'tests/unit/frontend/calculations.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/dom-utils.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/domain-rules.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/i18n.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/modal-rendering.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/security-utils.test.js', isNodeTest: true },
  { file: 'tests/unit/frontend/due-tickets.test.js', isNodeTest: true }
];

const INTEGRATION_TESTS = [
  'tests/integration/business-flow.test.js',
  'tests/integration/i18n-bilingual.test.js',
  'tests/integration/backend-auth.test.js',
  'tests/integration/ticket-customer-link.test.js',
  'tests/integration/passport-document.test.js',
  'tests/integration/round-trip-flight.test.js',
  'tests/integration/customer-payments-report.test.js',
  'tests/integration/backend-api.test.js',
  'tests/integration/employee-delete.test.js',
  'tests/integration/expenses.test.js',
  'tests/integration/ticket-extraction.test.js',
  'tests/integration/airlines-catalog.test.js',
  'tests/integration/pwa-install.test.js',
  'tests/integration/mobile-search.test.js',
  'tests/integration/boot-splash.test.js',
  'tests/integration/production-hardening.test.js',
  'tests/integration/customer-performance.test.js',
  'tests/integration/ticket-edit-expansion.test.js',
  'tests/integration/postgres-integration.test.js'
];

const SECURITY_TESTS = [
  'tests/security/rbac-ui.test.js',
  'tests/security/security-fixes.test.js',
  'tests/security/audit-fixes.test.js',
  'tests/security/purge-actions.test.js',
  'tests/security/security-hardening-round2.test.js',
  'tests/security/security-hardening-round3.test.js',
  'tests/security/rate-limiter.test.js',
  'tests/security/audit-p0-fixes.test.js'
];

// Parse command-line flags
const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isBail = args.includes('--bail');
const filterUnit = args.includes('--unit');
const filterIntegration = args.includes('--integration');
const filterSecurity = args.includes('--security');

if (isHelp) {
  console.log(`
AfricaTravel Test Runner
========================
Usage:
  node scripts/testing/test-runner.js [options]

Options:
  --unit         Run unit tests only
  --integration  Run integration tests only
  --security     Run security tests only
  --bail         Stop immediately on the first test failure
  --help, -h     Show this help message
`);
  process.exit(0);
}

// Build list of test tasks
const queue = [];

const addTests = (list, suiteName) => {
  for (const item of list) {
    const testFile = typeof item === 'string' ? item : item.file;
    const isNodeTest = typeof item === 'object' ? Boolean(item.isNodeTest) : false;
    queue.push({
      file: testFile,
      suite: suiteName,
      isNodeTest
    });
  }
};

const hasExplicitSuiteFilter = filterUnit || filterIntegration || filterSecurity;

if (!hasExplicitSuiteFilter || filterUnit) {
  addTests(UNIT_TESTS, 'UNIT');
}
if (!hasExplicitSuiteFilter || filterIntegration) {
  addTests(INTEGRATION_TESTS, 'INTEGRATION');
}
if (!hasExplicitSuiteFilter || filterSecurity) {
  addTests(SECURITY_TESTS, 'SECURITY');
}

console.log('\n✈️  ======================================================');
console.log('   AfricaTravel — Automated Test Suite Runner');
console.log(`   Running ${queue.length} test target(s) across selected suites`);
console.log('======================================================\n');

const startTime = Date.now();
const results = [];
let failuresCount = 0;

for (let i = 0; i < queue.length; i++) {
  const task = queue[i];
  const stepNumber = `[${i + 1}/${queue.length}]`;
  const suiteTag = `[${task.suite}]`.padEnd(14);
  const displayName = path.relative(ROOT_DIR, path.resolve(ROOT_DIR, task.file)).replace(/\\/g, '/');

  process.stdout.write(`⏳ ${stepNumber} ${suiteTag} ${displayName}... `);
  const taskStart = Date.now();

  const spawnArgs = task.isNodeTest
    ? ['--test', task.file]
    : [task.file];

  const res = spawnSync(process.execPath, spawnArgs, {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'ci_test_only_jwt_secret_do_not_use_in_prod_00000000',
      DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || 'CiTestOnlyPassword123'
    },
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'pipe']
  });

  const durationMs = Date.now() - taskStart;
  const isPassed = res.status === 0;

  if (isPassed) {
    process.stdout.write(`\r✅ ${stepNumber} ${suiteTag} ${displayName} (${durationMs}ms)\n`);
    results.push({ ...task, passed: true, durationMs });
  } else {
    process.stdout.write(`\r❌ ${stepNumber} ${suiteTag} ${displayName} FAILED (${durationMs}ms)\n`);
    failuresCount++;
    results.push({
      ...task,
      passed: false,
      durationMs,
      stdout: res.stdout,
      stderr: res.stderr,
      error: res.error
    });

    if (res.stdout) console.log('\n--- STDOUT --- \n' + res.stdout.trim());
    if (res.stderr) console.error('\n--- STDERR --- \n' + res.stderr.trim());

    if (isBail) {
      console.error('\n🚨 --bail enabled: stopping test runner immediately upon failure.\n');
      break;
    }
  }
}

const totalDurationMs = Date.now() - startTime;
const passedCount = results.filter(r => r.passed).length;

console.log('\n======================================================');
console.log(`   Execution Summary: ${passedCount} passed, ${failuresCount} failed (${(totalDurationMs / 1000).toFixed(2)}s)`);
console.log('======================================================\n');

if (failuresCount > 0) {
  console.error(`💥 ${failuresCount} test(s) failed.`);
  process.exit(1);
} else {
  console.log('🎉 All tests completed successfully with zero regressions.\n');
  process.exit(0);
}
