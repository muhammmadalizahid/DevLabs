import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const pendingRole = req.cookies.get('devlab_pending_role')?.value;
    const role = req.nextauth.token?.role || pendingRole;

    // Redirect to onboarding if no role assigned yet
    if (!role && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // Teacher trying to access student routes
    if (role === 'teacher' && pathname.startsWith('/student')) {
      return NextResponse.redirect(new URL('/teacher/dashboard', req.url));
    }

    // Student trying to access teacher routes
    if (role === 'student' && pathname.startsWith('/teacher')) {
      return NextResponse.redirect(new URL('/student/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/onboarding',
    '/api/classrooms/:path*',
    '/api/tests/:path*',
    '/api/submissions/:path*',
    '/api/datasets/:path*',
    '/api/practice/:path*',
    '/api/results/:path*',
    '/api/export/:path*',
    '/api/engine/:path*',
  ],
};
