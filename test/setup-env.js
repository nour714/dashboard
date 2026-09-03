/**
 * AfricaTravel - Test Environment Setup
 *
 * Ensures test environment variables are loaded from .env.test (or fallbacks)
 * so that tests run seamlessly both in CI and locally without manual configuration.
 */

import dotenv from 'dotenv';
import fs from 'fs';

// If .env.test exists, load it; otherwise try .env.test.example, then .env
if (fs.existsSync('.env.test')) {
  dotenv.config({ path: '.env.test' });
} else if (fs.existsSync('.env.test.example')) {
  dotenv.config({ path: '.env.test.example' });
}
dotenv.config();

// Ensure test defaults satisfy Zod validation schema if still unset
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_suite_jwt_secret_do_not_use_in_production_key_000000';
process.env.DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'TestOnlyAdminPassword123!';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/africatravel_test?schema=public';
