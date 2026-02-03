'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CORA_CLIENT_ID } from '@/lib/constants';

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientId = CORA_CLIENT_ID;
  const clientSecret = process.env.CORA_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error('Cora client secret is not configured.');
  }

  const tokenUrl = 'https://api.stage.cora.com.br/oauth/token';

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error from Cora API:', data);
      throw new Error(data.error_description || 'Failed to exchange code for token.');
    }

    // Here you would typically save the access_token, refresh_token, etc.
    // For now, we just return it.
    console.log('Successfully received token data:', data);
    return data;

  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}
