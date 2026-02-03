'use server';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  const finalRedirectOrigin = 'http://etheraapp.com';

  if (!code) {
    redirect(`${finalRedirectOrigin}/api-bank?error=authorization_failed`);
  }

  const redirectUri = 'http://etheraapp.com/api-bank/callback';

  try {
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    redirect(`${finalRedirectOrigin}/api-bank?success=true`);

  } catch (error: any) {
    redirect(`${finalRedirectOrigin}/api-bank?error=${encodeURIComponent(error.message)}`);
  }
}
