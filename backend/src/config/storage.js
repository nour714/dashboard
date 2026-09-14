/**
 * AfricaTravel - Supabase Storage Client
 *
 * Provides a singleton Supabase client configured with the service-role key
 * for server-side storage operations (upload, signed URL, delete).
 * The bucket is always private — access is gated through the app's own
 * auth/role middleware + short-lived signed URLs.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabaseInstance = null;

/**
 * Returns a Supabase client configured with the service-role key.
 * Lazily initialized — only created on first call.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured. ' +
        'Set them in your .env file or deployment environment variables.'
      );
    }
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseInstance;
}

/**
 * Override the Supabase client instance (for testing).
 * @param {object|null} client
 */
export function setSupabaseClient(client) {
  supabaseInstance = client;
}

/**
 * Returns the configured storage bucket name.
 * @returns {string}
 */
export function getStorageBucket() {
  return env.SUPABASE_STORAGE_BUCKET || 'customer-documents';
}

/**
 * Upload a file buffer to the private storage bucket.
 * @param {string} storagePath - e.g. "customers/CUST-1234/passport-uuid.jpg"
 * @param {Buffer} buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function uploadToStorage(storagePath, buffer, contentType) {
  const supabase = getSupabaseClient();
  const bucket = getStorageBucket();
  return supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true
  });
}

/**
 * Create a signed URL for a private object.
 * @param {string} storagePath
 * @param {number} expiresIn - seconds (default 300 = 5 minutes)
 * @returns {Promise<{data: {signedUrl: string}|null, error: object|null}>}
 */
export async function createSignedUrl(storagePath, expiresIn = 300) {
  const supabase = getSupabaseClient();
  const bucket = getStorageBucket();
  return supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
}

/**
 * Delete an object from the private storage bucket.
 * @param {string} storagePath
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export async function deleteFromStorage(storagePath) {
  const supabase = getSupabaseClient();
  const bucket = getStorageBucket();
  return supabase.storage.from(bucket).remove([storagePath]);
}
