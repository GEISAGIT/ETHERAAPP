import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/api-bank?error=authorization_failed', request.url));
  }

  // The redirect_uri must match exactly what was sent in the initial authorization request.
  // We use the request's origin to ensure it works on localhost, preview URLs, and the final domain.
  const redirectUri = `${request.nextUrl.origin}/api-bank/callback`;

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    // On success, redirect to the bank page with a success message
    return NextResponse.redirect(new URL('/api-bank?success=true', request.url));

  } catch (error: any) {
    // On failure, redirect with an error message
    return NextResponse.redirect(new URL(`/api-bank?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
