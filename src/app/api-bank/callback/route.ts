'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  // The final destination for the user after the callback is handled.
  // This should be the public domain the user accesses the app from.
  const finalRedirectOrigin = 'http://etheraapp.com';

  if (!code) {
    return NextResponse.redirect(new URL('/api-bank?error=authorization_failed', finalRedirectOrigin));
  }

  // This redirect_uri must exactly match what's configured in the Cora Developer Panel
  // and what was sent in the initial authorization request.
  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    // On success, redirect the user's browser back to the bank page within the app.
    return NextResponse.redirect(new URL('/api-bank?success=true', finalRedirectOrigin));

  } catch (error: any) {
    // On failure, redirect with an error message to the bank page.
    return NextResponse.redirect(new URL(`/api-bank?error=${encodeURIComponent(error.message)}`, finalRedirectOrigin));
  }
}
