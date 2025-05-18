import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function POST(req) {
  try {
    const { value } = await req.json();

    if (typeof value !== 'number') {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }

    await sql`INSERT INTO bitcoin_data (value) VALUES (${value})`;

    return NextResponse.json({ success: true, value });
  } catch (error) {
    console.error('DB insert error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function GET() {
  const data = await sql`SELECT id, value, to_char(date, 'YYYY-MM-DD"T"HH24:MI:SS') as created_at FROM bitcoin_data`;
  return NextResponse.json({ success: true, data });
}
