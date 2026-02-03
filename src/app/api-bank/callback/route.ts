'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  console.log('Callback route hit. Full URL:', request.url);
  console.log('Received authorization code:', code);

  const finalRedirectUrlBase = 'http://etheraapp.com/api-bank';

  if (!code) {
    const errorUrl = `${finalRedirectUrlBase}?error=authorization_failed`;
    return new NextResponse(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errorUrl}" /></head><body>Redirecionando...</body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const redirectUriForTokenExchange = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUriForTokenExchange);
    const successUrl = `${finalRedirectUrlBase}?success=true`;
    console.log('Token exchange successful. Redirecting to:', successUrl);
    return new NextResponse(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${successUrl}" /></head><body>Redirecionando...</body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    const errorUrl = `${finalRedirectUrlBase}?error=${encodeURIComponent(error.message)}`;
    console.error('Error during token exchange:', error.message);
    console.log('Redirecting to error page:', errorUrl);
    return new NextResponse(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${errorUrl}" /></head><body>Redirecionando...</body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
