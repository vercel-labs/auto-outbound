import dotenv from 'dotenv';
import path from 'path';

// Load .env.local so DATABASE_URL, AI_GATEWAY_API_KEY, etc. are available
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
