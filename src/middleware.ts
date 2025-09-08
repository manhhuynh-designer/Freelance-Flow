import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Handle share links /s/{id}
  if (pathname.startsWith('/s/') && pathname.length > 3) {
    // Ensure the request continues to the dynamic route
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/s/:path*',
    '/api/share/:path*'
  ]
}
