'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { exchangeCodeForToken } from '@/app/api-bank/actions';
import { useUser } from '@/firebase';
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

    if (!user) {
      // Wait for user to be loaded
      return;
    }

    const processToken = async () => {
        const result = await exchangeCodeForToken(code);
        
        if (result.error) {
            setError(result.error);
            setStatus('error');
            return;
        }

        // --- SIMPLIFICATION FOR DEBUGGING ---
        // We are temporarily skipping the step of saving the token to the database
        // to isolate the problem. We are just confirming the token exchange works.
        
        toast({
          title: 'Etapa 1/2 Concluída: Token Recebido!',
          description: 'A conexão com a Cora funcionou. Redirecionando...',
        });

        setStatus('success');
        // Redirecting back to the main API bank page.
        // You will see the "Authorize" button again because we haven't saved the token yet.
        // This confirms the token exchange is working.
        router.push('/api-bank');
    };

    processToken();
  }, [searchParams, router, user, toast]);

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
                  Verifique se a variável de ambiente `CORA_CLIENT_SECRET` foi configurada corretamente no servidor.
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
      <p className="text-muted-foreground">Finalizando conexão com a Cora (Etapa 1 de 2)...</p>
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
