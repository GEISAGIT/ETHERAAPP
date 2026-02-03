'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CoraToken } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ExchangeToken() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Ocorreu um erro durante a autorização: ${errorParam}`);
      return;
    }

    if (!code || !state) {
      setError('Parâmetros de autorização inválidos.');
      return;
    }

    if (!user || !firestore) {
      // This can happen if the page loads before the user state is ready.
      // We'll let it retry on the next render.
      return;
    }

    let userIdFromState: string;
    try {
      userIdFromState = JSON.parse(atob(state)).userId;
    } catch (e) {
      setError('Parâmetro de estado inválido ou corrompido.');
      return;
    }

    if (user.uid !== userIdFromState) {
        setError('A sessão do usuário não corresponde à solicitação de autorização. Por segurança, o processo foi interrompido.');
        return;
    }

    const processToken = async () => {
      try {
        const tokenData = await exchangeCodeForToken(code);
        
        if (tokenData.error) {
            throw new Error(tokenData.error_description || tokenData.error);
        }

        const expiresAt = Timestamp.fromMillis(Date.now() + tokenData.expires_in * 1000);

        const coraToken: CoraToken = {
          userId: user.uid,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expiresAt,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
        };

        const tokenDocRef = doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
        
        // This is a non-blocking call
        setDocumentNonBlocking(tokenDocRef, coraToken, { merge: true });

        toast({
          title: 'Conexão bem-sucedida!',
          description: 'Sua conta Cora foi conectada com sucesso.',
        });

        router.push('/api-bank');

      } catch (e: any) {
        console.error('Error exchanging code for token:', e);
        setError(e.message || 'Falha ao trocar o código de autorização pelo token de acesso.');
      }
    };

    processToken();
  }, [searchParams, router, firestore, user, toast]);

  if (error) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-lg">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha na Conexão</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
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
      <p className="text-muted-foreground">Finalizando conexão com a Cora...</p>
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
