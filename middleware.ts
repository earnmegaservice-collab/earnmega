import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Let /hq99 and /geemings-command-x9v2 pass through to client for client-side SupremeAdminGate auth
  if (
    request.nextUrl.pathname.startsWith('/geemings-command-x9v2') ||
    request.nextUrl.pathname.startsWith('/hq99')
  ) {
    let supabaseResponse = NextResponse.next({
      request,
    });

    // We still try to refresh the session if we can, but we DON'T block on failure
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              supabaseResponse = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              );
            },
          },
        }
      );
      // Just ping to keep it alive if it's there
      await supabase.auth.getUser();
    } catch (e) {
      // Ignore errors so we always let the user see the client-side terminal to login
    }

    return supabaseResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/geemings-command-x9v2/:path*',
    '/hq99/:path*'
  ],
};
