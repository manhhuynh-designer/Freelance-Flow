import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // Log to server console so dev output shows ordering
    // eslint-disable-next-line no-console
    console.log('[TRACE-SAVING]', JSON.stringify(payload));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('[TRACE-SAVING] malformed payload');
  }
  return NextResponse.json({ ok: true });
}
