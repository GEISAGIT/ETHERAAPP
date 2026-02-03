import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  const getOrigin = () => {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (!host) {
      // Fallback for local development if host header is not present
      return request.nextUrl.origin;
    }
    return `${proto}://${host}`;
  }
  
  const origin = getOrigin();

  if (!code) {
    return NextResponse.redirect(new URL('/api-bank?error=authorization_failed', origin));
  }

  // Hardcoded redirect URI to match what's configured in Cora for the production app
  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    // On success, redirect the user's browser back to the bank page within the current app origin
    return NextResponse.redirect(new URL('/api-bank?success=true', origin));

  } catch (error: any) {
    // On failure, redirect with an error message
    return NextResponse.redirect(new URL(`/api-bank?error=${encodeURIComponent(error.message)}`, origin));
  }
}
