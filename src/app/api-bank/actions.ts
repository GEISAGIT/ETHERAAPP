'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CORA_CLIENT_ID } from '@/lib/constants';

export async function exchangeCodeForToken(code: string): Promise<{ data?: any, error?: string }> {
  const clientId = CORA_CLIENT_ID;
  const clientSecret = process.env.CORA_CLIENT_SECRET;

  if (!clientSecret) {
    console.error("CRITICAL: CORA_CLIENT_SECRET is not configured in environment variables.");
    return { error: 'A variável de ambiente CORA_CLIENT_SECRET não foi definida no servidor.' };
  }

  const tokenUrl = 'https://api.stage.cora.com.br/oauth/token';
  const redirectUri = 'http://etheraapp.com/api-bank/callback';

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

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Error from Cora API during token exchange:', responseData);
      return { error: responseData.error_description || 'Falha ao trocar o código pelo token na API da Cora.' };
    }
    
    return { data: responseData };

  } catch (error: any) {
    console.error('Network or other error during token exchange:', error);
    return { error: 'Ocorreu um erro de comunicação ao tentar conectar com a Cora.' };
  }
}

export async function getAccountBalance(accessToken: string): Promise<any> {
    const balanceUrl = 'https://api.stage.cora.com.br/v1/account/balance';
    try {
        const response = await fetch(balanceUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Error getting balance from Cora:', data);
            throw new Error(data.message || 'Failed to get balance.');
        }
        return data;
    } catch (error) {
        console.error('Error getting account balance:', error);
        throw error;
    }
}

export async function refreshCoraToken(refreshToken: string): Promise<any> {
    const clientId = CORA_CLIENT_ID;
    const clientSecret = process.env.CORA_CLIENT_SECRET;

    if (!clientSecret) {
        throw new Error('Cora client secret is not configured.');
    }

    const tokenUrl = 'https://api.stage.cora.com.br/oauth/token';
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Error refreshing token:', data);
            throw new Error(data.error_description || 'Failed to refresh token.');
        }
        return data;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
}
