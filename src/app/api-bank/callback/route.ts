import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/api-bank?error=authorization_failed', request.url));
  }

  // The redirect_uri must match exactly what was sent in the initial authorization request.
  const redirectUri = request.nextUrl.origin.includes('localhost')
    ? 'http://localhost:9002/api-bank/callback'
    : 'https://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    // On success, redirect to the bank page with a success message
    return NextResponse.redirect(new URL('/api-bank?success=true', request.url));

  } catch (error: any) {
    // On failure, redirect with an error message
    return NextResponse.redirect(new URL(`/api-bank?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
