import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ['/habits', '/api/habits'];

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If trying to access protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and trying to access login page
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/habits', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/habits', '/api/habits/:path*', '/login'],
};