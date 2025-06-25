import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('next-auth.session-token') || 
                      request.cookies.get('__Secure-next-auth.session-token')

  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (sessionToken && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!sessionToken && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = new URL('/auth/signin', request.url)
    url.searchParams.set('callbackUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}