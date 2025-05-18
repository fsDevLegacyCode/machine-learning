import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { value } = req.body;
  if (typeof value !== 'number') {
    return res.status(400).json({ error: 'Invalid value' });
  }

  try {
    await sql('INSERT INTO predicted_prices (value) VALUES ($1)', [value]);
    return res.status(200).json({ success: true, value });
  } catch (error) {
    console.error('DB insert error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
}
