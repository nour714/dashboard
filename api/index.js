/**
 * Vercel Serverless Function Handler
 * Dedicated API handler for Vercel deployment
 */

import { createApiApp } from '../server/src/app.js';

const app = createApiApp();

export default app;
