'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CoraAuthForm() {
  const handleLogin = () => {
    // Usando exatamente a URL fornecida pelo usuário para evitar qualquer problema de codificação.
    const authUrl = 'https://api.stage.cora.com.br/oauth/authorize?client_id=app-5PvHrdVlMh7NZiLrcgvKbO&response_type=code&redirect_uri=http://localhost:9002/api-bank/callback&scopes=invoice%20account%20payment';
    window.location.href = authUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar com a Cora</CardTitle>
        <CardDescription>
          Para começar a automatizar suas finanças, autorize o acesso à sua conta Cora. Você será redirecionado para a página de login da Cora.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <Button onClick={handleLogin}>
              Autorizar Acesso à Conta Cora
            </Button>
            <p className="rounded-md border border-amber-500 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <span className="font-bold">Atenção:</span> Este é um ambiente de teste (homologação). As alterações aqui não afetam o seu aplicativo em produção.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
