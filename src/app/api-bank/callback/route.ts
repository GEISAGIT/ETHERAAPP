import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/api-bank?error=authorization_failed', request.url));
  }

  // Hardcoded redirect URI to match what's configured in Cora for the production app
  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    // On success, redirect the user's browser back to the bank page within the current app origin
    return NextResponse.redirect(new URL('/api-bank?success=true', request.url));

  } catch (error: any) {
    // On failure, redirect with an error message
    return NextResponse.redirect(new URL(`/api-bank?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
