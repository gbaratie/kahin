/**
 * Charge apps/api/.env avant tout module qui lit process.env (ex. container).
 * Chemin basé sur __dirname pour rester correct quel que soit le cwd.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
