import type { NextApiRequest, NextApiResponse } from 'next';
const { Pool } = require('pg');
import bcrypt from 'bcryptjs';

const pool = new Pool({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    if (rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hash = bcrypt.hashSync(password, 10);

    await client.query(
      'INSERT INTO users(full_name, email, password_hash, role) VALUES($1, $2, $3, $4)',
      [name, email, hash, 'user']
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal error' });
  } finally {
    client.release();
  }
}