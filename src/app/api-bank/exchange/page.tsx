'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase'; // Import firestore and setDoc
import { doc, Timestamp } from 'firebase/firestore'; // Import doc and Timestamp
import type { CoraToken } from '@/lib/types'; // Import CoraToken type
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ExchangeToken() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore(); // Get firestore instance
  const { toast } = useToast();
  
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Ocorreu um erro durante a autorização: ${errorParam}`);
      setStatus('error');
      return;
    }

    if (!code || !state) {
      setError('Parâmetros de autorização inválidos.');
      setStatus('error');
      return;
    }

    if (!user || !firestore) {
      // Wait for user and firestore to be loaded
      return;
    }

    const processToken = async () => {
      try {
        const result = await exchangeCodeForToken(code);
        
        if (result.error) {
            setError(result.error);
            setStatus('error');
            return;
        }

        const tokenData = result.data;
        const tokenDocRef = doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');

        const coraToken: CoraToken = {
            userId: user.uid,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Timestamp.fromMillis(Date.now() + tokenData.expires_in * 1000),
            scope: tokenData.scope,
            tokenType: tokenData.token_type,
        };

        // Use non-blocking write to save the token
        setDocumentNonBlocking(tokenDocRef, coraToken, { merge: true });
        
        toast({
          title: 'Conexão Realizada com Sucesso!',
          description: 'Sua conta Cora foi conectada. Redirecionando para a página da API.',
        });

        setStatus('success');
        // Replace the current history entry instead of pushing a new one
        router.replace('/api-bank');
      } catch (e: any) {
        console.error("Falha ao processar o token:", e);
        setError(e.message || "Ocorreu um erro crítico ao comunicar com o servidor.");
        setStatus('error');
      }
    };

    processToken();
  }, [searchParams, router, user, firestore, toast]);

  if (status === 'error') {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-lg">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha na Conexão com a Cora</AlertTitle>
              <AlertDescription>
                <p>
                  Não foi possível finalizar a conexão. Ocorreu o seguinte erro:
                </p>
                <p className="mt-2 font-mono bg-destructive/10 p-2 rounded-md text-xs">
                  {error || "Erro desconhecido."}
                </p>
                <p className="mt-4">
                  Verifique se a variável de ambiente `CORA_CLIENT_SECRET` foi configurada corretamente no servidor e se o serviço foi reiniciado.
                </p>
                <Button asChild variant="link" className="p-0 mt-2">
                    <Link href="/api-bank">Tentar Novamente</Link>
                </Button>
              </AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Finalizando conexão com a Cora (Etapa 2 de 2)...</p>
    </div>
  );
}

export default function ExchangePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        }>
            <ExchangeToken />
        </Suspense>
    )
}
