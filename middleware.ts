import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/geemings-command-x9v2') || request.nextUrl.pathname.startsWith('/api/admin/action')) {
    let supabaseResponse = NextResponse.next({
      request,
    });

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

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      const email = user.email?.toLowerCase();
      if (email !== 'horpalservice@gmail.com' && email !== 'geestablish@gmail.com') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      return supabaseResponse;
    } catch (e) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/geemings-command-x9v2/:path*',
    '/api/admin/action',
  ],
};
