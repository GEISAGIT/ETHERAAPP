'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Callback route hit. Full URL from request:', request.url);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  console.log('Received authorization code:', code);

  const finalRedirectUrlBase = 'http://etheraapp.com/api-bank';

  if (!code) {
    const errorUrl = `${finalRedirectUrlBase}?error=authorization_failed`;
    console.log('Authorization code not found. Redirecting to:', errorUrl);
    return NextResponse.redirect(errorUrl);
  }

  const redirectUriForTokenExchange = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUriForTokenExchange);
    const successUrl = `${finalRedirectUrlBase}?success=true`;
    console.log('Token exchange successful. Redirecting to:', successUrl);
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    const errorUrl = `${finalRedirectUrlBase}?error=${encodeURIComponent(error.message)}`;
    console.error('Error during token exchange:', error.message);
    console.log('Redirecting to error page:', errorUrl);
    return NextResponse.redirect(errorUrl);
  }
}
