'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  const finalRedirectOrigin = 'http://etheraapp.com';

  if (!code) {
    const url = `${finalRedirectOrigin}/api-bank?error=authorization_failed`;
    return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });
  }

  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    const url = `${finalRedirectOrigin}/api-bank?success=true`;
     return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });

  } catch (error: any) {
    const url = `${finalRedirectOrigin}/api-bank?error=${encodeURIComponent(error.message)}`;
    return new NextResponse(null, {
        status: 302,
        headers: { 'Location': url },
    });
  }
}
