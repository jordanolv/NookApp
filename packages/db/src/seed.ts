import 'dotenv/config';
import { createDb } from './client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const _db = createDb(url);

console.log('seed: nothing to seed yet');
process.exit(0);
