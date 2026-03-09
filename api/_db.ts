import { query } from './_db.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  // Keep your original connection string here
  connectionString: process.env.DATABASE_URL, 
  
  // Add this new property below it
  ssl: {
    rejectUnauthorized: false
  }
});

