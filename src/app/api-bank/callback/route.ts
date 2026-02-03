'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('Callback route hit. Full URL:', request.url);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  console.log('Received authorization code:', code);

  const finalRedirectOrigin = 'http://etheraapp.com';

  if (!code) {
    console.log('Authorization code not found, redirecting to error page.');
    const url = `${finalRedirectOrigin}/api-bank?error=authorization_failed`;
    return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });
  }

  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    console.log('Token exchange successful, redirecting to success page.');
    const url = `${finalRedirectOrigin}/api-bank?success=true`;
     return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });

  } catch (error: any) {
    console.error('Error during token exchange:', error.message);
    const url = `${finalRedirectOrigin}/api-bank?error=${encodeURIComponent(error.message)}`;
    return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });
  }
}
