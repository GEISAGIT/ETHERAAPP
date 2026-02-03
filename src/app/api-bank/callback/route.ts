import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const exchangeUrl = new URL('/api-bank/exchange', request.url);

  if (error) {
    exchangeUrl.searchParams.set('error', error);
    return NextResponse.redirect(exchangeUrl);
  }

  if (!code || !state) {
    exchangeUrl.searchParams.set('error', 'authorization_failed');
    return NextResponse.redirect(exchangeUrl);
  }

  exchangeUrl.searchParams.set('code', code);
  exchangeUrl.searchParams.set('state', state);

  return NextResponse.redirect(exchangeUrl);
}
