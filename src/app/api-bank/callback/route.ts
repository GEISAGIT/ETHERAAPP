'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  console.log('Callback route hit. Full URL:', request.url);
  console.log('Received authorization code:', code);

  // This must be the final public URL of your app.
  const finalRedirectUrlBase = 'http://etheraapp.com/api-bank';

  if (!code) {
    const errorUrl = new URL(finalRedirectUrlBase);
    errorUrl.searchParams.set('error', 'authorization_failed');
    return NextResponse.redirect(errorUrl);
  }

  // The redirect URI used in the token exchange must EXACTLY match the one used in the auth request
  const redirectUriForTokenExchange = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUriForTokenExchange);

    const successUrl = new URL(finalRedirectUrlBase);
    successUrl.searchParams.set('success', 'true');
    console.log('Token exchange successful. Redirecting to:', successUrl.toString());
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    const errorUrl = new URL(finalRedirectUrlBase);
    // Use encodeURIComponent to handle special characters in the error message
    errorUrl.searchParams.set('error', error.message || 'token_exchange_failed');
    console.error('Error during token exchange:', error.message);
    console.log('Redirecting to error page:', errorUrl.toString());
    return NextResponse.redirect(errorUrl);
  }
}
