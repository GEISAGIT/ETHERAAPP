'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CORA_CLIENT_ID } from '@/lib/constants';
import { useUser } from '@/firebase';

export function CoraAuthForm() {
  const { user } = useUser();
  const clientId = CORA_CLIENT_ID;

  const handleLogin = () => {
    if (!user) {
      // Handle case where user is not logged in
      console.error("User not logged in");
      return;
    }
    if (!clientId) {
      console.error("Cora Client ID is not configured.");
      return;
    }

    const scopes = 'invoice account payment';
    const redirectUri = 'http://etheraapp.com/api-bank/callback';

    // Pass the userId in the state parameter
    const state = btoa(JSON.stringify({ userId: user.uid }));
    
    const authUrl = `https://api.stage.cora.com.br/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scopes=${scopes}&state=${state}`;
    
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
            <Button onClick={handleLogin} disabled={!user || !clientId}>
              Autorizar Acesso à Conta Cora
            </Button>
            {!clientId && (
                 <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    <b>Ação Necessária:</b> A variável de ambiente <code>NEXT_PUBLIC_CORA_CLIENT_ID</code> não foi configurada. Por favor, adicione-a ao seu arquivo <code>.env</code> para continuar.
                </p>
            )}
            <p className="rounded-md border border-amber-500 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <span className="font-bold">Atenção:</span> Este é um ambiente de teste (homologação). As alterações aqui não afetam o seu aplicativo em produção.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
