'use server';

import { CORA_CLIENT_ID } from '@/lib/constants';

// Helper to safely parse response and handle errors
async function handleCoraResponse(response: Response) {
    const text = await response.text();
    let data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        // If parsing fails, the response was likely plain text.
        // We use the text as the error message.
        data = { message: text || "A resposta da API não estava no formato esperado." };
    }

    if (!response.ok) {
        const errorMessage = data.message || data.error_description || 'Ocorreu um erro na comunicação com a Cora.';
        console.error('Error from Cora API:', { status: response.status, body: data });
        return { error: errorMessage, status: response.status };
    }
    
    return { data };
}


export async function exchangeCodeForToken(code: string): Promise<{ data?: any, error?: string }> {
  const clientId = CORA_CLIENT_ID;
  const clientSecret = process.env.CORA_CLIENT_SECRET;

  if (!clientSecret) {
    const errorMessage = 'A variável de ambiente CORA_CLIENT_SECRET não foi definida no servidor.';
    console.error(`CRITICAL: ${errorMessage}`);
    return { error: errorMessage };
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
    
    const result = await handleCoraResponse(response);
    return { data: result.data, error: result.error };

  } catch (error: any) {
    console.error('Network or other error during token exchange:', error);
    return { error: 'Ocorreu um erro de comunicação ao tentar conectar com a Cora.' };
  }
}

export async function getAccountBalance(accessToken: string): Promise<{ data?: any; error?: string; isTokenError?: boolean; }> {
    const balanceUrl = 'https://api.stage.cora.com.br/third-party/account/balance';
    try {
        const response = await fetch(balanceUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'accept': 'application/json'
            },
        });

        const result = await handleCoraResponse(response);

        if (result.error) {
            const isTokenError = result.status === 401 || (result.error && result.error.toLowerCase().includes('token'));
            return { error: result.error, isTokenError };
        }
        
        return { data: result.data };

    } catch (error: any) {
        console.error('Network or other error getting account balance:', error);
        return { error: error.message || 'Ocorreu um erro de rede ao buscar o saldo.' };
    }
}

export async function getAccountData(accessToken: string): Promise<{ data?: any; error?: string; isTokenError?: boolean; }> {
    const accountDataUrl = 'https://api.stage.cora.com.br/third-party/account/';
    try {
        const response = await fetch(accountDataUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'accept': 'application/json'
            },
        });

        const result = await handleCoraResponse(response);

        if (result.error) {
            const isTokenError = result.status === 401 || (result.error && result.error.toLowerCase().includes('token'));
            return { error: result.error, isTokenError };
        }
        
        return { data: result.data };

    } catch (error: any) {
        console.error('Network or other error getting account data:', error);
        return { error: error.message || 'Ocorreu um erro de rede ao buscar os dados da conta.' };
    }
}


export async function refreshCoraToken(refreshToken: string): Promise<{ data?: any; error?: string }> {
    const clientId = CORA_CLIENT_ID;
    const clientSecret = process.env.CORA_CLIENT_SECRET;

    if (!clientSecret) {
        const errorMessage = 'Cora client secret is not configured.';
        console.error(errorMessage);
        return { error: errorMessage };
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

        const result = await handleCoraResponse(response);
        return { data: result.data, error: result.error };
        
    } catch (error: any) {
        console.error('Network or other error refreshing token:', error);
        return { error: error.message || 'Ocorreu um erro de rede ao atualizar o token.' };
    }
}
