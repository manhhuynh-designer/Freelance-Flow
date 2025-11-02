import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For development only - reset would happen client-side
    return NextResponse.json({ 
      message: 'Reset should be done client-side. Open DevTools Console and run: localStorage.clear(); location.reload();' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'To reset data, open DevTools Console and run: localStorage.clear(); location.reload();',
    instructions: [
      '1. Open DevTools (F12)',
      '2. Go to Console tab',
      '3. Run: localStorage.clear()',
      '4. Run: location.reload()',
      '5. This will reset PouchDB and reload with initial data'
    ]
  });
}