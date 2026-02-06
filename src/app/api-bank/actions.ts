'use server';

import { CORA_CLIENT_ID } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import type { CoraInvoiceRequestBody } from '@/lib/types';

// Helper to safely parse response and handle errors
async function handleCoraResponse(response: Response) {
    const text = await response.text();
    let data;

    if (!response.ok) {
        let errorMessage = `Erro da API Cora (Status: ${response.status}).`;
        try {
            data = JSON.parse(text);
            errorMessage += `\nDetalhes: ${JSON.stringify(data, null, 2)}`;
        } catch (e) {
            errorMessage += `\nResposta: ${text}`;
        }

        console.error('Error from Cora API:', { status: response.status, body: text });
        return { error: errorMessage, status: response.status };
    }

    try {
        data = JSON.parse(text);
        return { data };
    } catch (error) {
        console.error('Failed to parse successful Cora API response:', text);
        return { error: "A resposta da API Cora foi bem-sucedida, mas o formato era inválido.", status: response.status };
    }
}


export async function exchangeCodeForToken(code: string): Promise<{ data?: any, error?: string }> {
  const clientId = CORA_CLIENT_ID;
  const clientSecret = process.env.CORA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const missingVars = [!clientId && 'NEXT_PUBLIC_CORA_CLIENT_ID', !clientSecret && 'CORA_CLIENT_SECRET'].filter(Boolean).join(', ');
    const errorMessage = `As seguintes variáveis de ambiente não foram definidas no servidor: ${missingVars}.`;
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

    if (!clientId || !clientSecret) {
        const missingVars = [!clientId && 'NEXT_PUBLIC_CORA_CLIENT_ID', !clientSecret && 'CORA_CLIENT_SECRET'].filter(Boolean).join(', ');
        const errorMessage = `As seguintes variáveis de ambiente não foram definidas no servidor: ${missingVars}.`;
        console.error(`CRITICAL: ${errorMessage}`);
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

export async function getBankStatement(
  accessToken: string,
  options: { start?: string; end?: string }
): Promise<{ data?: any; error?: string; isTokenError?: boolean }> {
  const statementUrl = new URL('https://api.stage.cora.com.br/bank-statement/statement');
  
  if (options.start) statementUrl.searchParams.set('start', options.start);
  if (options.end) statementUrl.searchParams.set('end', options.end);
  statementUrl.searchParams.set('perPage', '100');

  try {
    const response = await fetch(statementUrl.toString(), {
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
    console.error('Network or other error getting bank statement:', error);
    return { error: error.message || 'Ocorreu um erro de rede ao buscar o extrato.' };
  }
}

export async function initiatePayment(
    accessToken: string,
    digitableLine: string,
    scheduledAt?: string
): Promise<{ data?: any; error?: string; isTokenError?: boolean; }> {
    const paymentUrl = 'https://api.stage.cora.com.br/payments/initiate';
    const idempotencyKey = uuidv4();

    const body: { digitable_line: string; scheduled_at?: string } = {
        digitable_line: digitableLine,
    };

    if (scheduledAt) {
        body.scheduled_at = scheduledAt;
    }

    try {
        const response = await fetch(paymentUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'accept': 'application/json',
                'Idempotency-Key': idempotencyKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await handleCoraResponse(response);

        if (result.error) {
            const isTokenError = result.status === 401 || (result.error && result.error.toLowerCase().includes('token'));
            return { error: result.error, isTokenError };
        }
        
        return { data: result.data };

    } catch (error: any) {
        console.error('Network or other error initiating payment:', error);
        return { error: error.message || 'Ocorreu um erro de rede ao iniciar o pagamento.' };
    }
}


export async function issueInvoice(
    accessToken: string,
    invoiceData: CoraInvoiceRequestBody
): Promise<{ data?: any; error?: string; isTokenError?: boolean; }> {
    const issueInvoiceUrl = 'https://api.stage.cora.com.br/v2/invoices/';
    const idempotencyKey = uuidv4();

    try {
        const response = await fetch(issueInvoiceUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'accept': 'application/json',
                'Idempotency-Key': idempotencyKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invoiceData),
        });

        const result = await handleCoraResponse(response);

        if (result.error) {
            const isTokenError = result.status === 401 || (result.error && result.error.toLowerCase().includes('token'));
            return { error: result.error, isTokenError };
        }
        
        return { data: result.data };

    } catch (error: any) {
        console.error('Network or other error issuing invoice:', error);
        return { error: error.message || 'Ocorreu um erro de rede ao emitir a cobrança.' };
    }
}
