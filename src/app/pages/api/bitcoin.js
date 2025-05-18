import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      const { rows } = await client.query('SELECT * FROM bitcoin_data ORDER BY date ASC');
      client.release();
      return res.status(200).json(rows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { value } = req.body;
      if (typeof value !== 'number') return res.status(400).json({ error: 'Invalid value' });
      const client = await pool.connect();
      const { rows } = await client.query(
        'INSERT INTO bitcoin_data (value) VALUES ($1) RETURNING *',
        [value]
      );
      client.release();
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
