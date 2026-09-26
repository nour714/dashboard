/**
 * AfricaTravel — Python Live Hotel Scraper Integration Service
 * Executes Playwright-based Python scraper to fetch real live accommodation listings.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPER_SCRIPT_PATH = path.resolve(__dirname, '../scrapers/booking_scraper.py');
const SCRAPER_TIMEOUT_MS = 16000;

export const PythonScraperService = {
  /**
   * Run the Python Booking.com scraper
   * @param {Object} params
   * @param {string} params.destination
   * @param {string} params.checkIn YYYY-MM-DD
   * @param {string} params.checkOut YYYY-MM-DD
   * @returns {Promise<Object|null>} Parsed hotel data or null if scraping fails
   */
  async scrapeLiveHotel({ destination, checkIn, checkOut }) {
    const pythonBin = process.env.PYTHON_BIN || 'python';

    // Format dates to YYYY-MM-DD
    const formatDate = (dateStr) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toISOString().split('T')[0];
      } catch {
        return dateStr;
      }
    };

    const formattedCheckIn = formatDate(checkIn);
    const formattedCheckOut = formatDate(checkOut);

    return new Promise((resolve) => {
      let isSettled = false;
      const done = (result) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        console.warn(`[PythonScraper] Scraper timed out after ${SCRAPER_TIMEOUT_MS}ms for destination: "${destination}". Falling back to AI/Catalog.`);
        try {
          proc.kill();
        } catch {
          // ignore
        }
        done(null);
      }, SCRAPER_TIMEOUT_MS);

      let stdoutData = '';
      let stderrData = '';

      const args = [
        SCRAPER_SCRIPT_PATH,
        '--destination', destination,
        '--checkin', formattedCheckIn,
        '--checkout', formattedCheckOut
      ];

      let proc;
      try {
        proc = spawn(pythonBin, args, {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
          windowsHide: true
        });
      } catch (err) {
        console.warn('[PythonScraper] Failed to spawn python process:', err.message);
        return done(null);
      }

      proc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8');
      });

      proc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8');
      });

      proc.on('error', (err) => {
        console.warn('[PythonScraper] Process error:', err.message);
        done(null);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[PythonScraper] Process exited with code ${code}. Stderr: ${stderrData.slice(0, 200)}`);
          return done(null);
        }

        try {
          const trimmed = stdoutData.trim();
          if (!trimmed) {
            return done(null);
          }
          const parsed = JSON.parse(trimmed);
          if (parsed.error) {
            console.warn('[PythonScraper] Scraper reported error:', parsed.error);
            return done(null);
          }
          done(parsed);
        } catch (parseErr) {
          console.warn('[PythonScraper] Failed to parse JSON output:', parseErr.message, 'Output:', stdoutData.slice(0, 200));
          done(null);
        }
      });
    });
  }
};
