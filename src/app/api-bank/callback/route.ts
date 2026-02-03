import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = 'http://etheraapp.com';
  // The destination is the new exchange page to handle the token logic
  const exchangeUrl = new URL('/api-bank/exchange', baseUrl);

  if (error) {
    exchangeUrl.searchParams.set('error', error);
  } else if (!code || !state) {
    exchangeUrl.searchParams.set('error', 'authorization_failed');
  } else {
    exchangeUrl.searchParams.set('code', code);
    exchangeUrl.searchParams.set('state', state);
  }

  // Manually construct the redirect response. This is more robust
  // in this specific hosting environment.
  return new Response(null, {
    status: 302, // Temporary Redirect
    headers: {
      'Location': exchangeUrl.toString(),
    },
  });
}
