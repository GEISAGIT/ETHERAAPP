'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { CoraAuthForm } from '@/components/cora/cora-auth-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking } from '@/firebase';
import type { CoraToken } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { getAccountBalance, refreshCoraToken } from './actions';
import { useToast } from '@/hooks/use-toast';


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function CoraAccountDetails({ token }: { token: CoraToken }) {
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleGetBalance = async (accessToken: string) => {
        setIsLoading(true);
        try {
            const balanceData = await getAccountBalance(accessToken);
            setBalance(balanceData.amount);
        } catch (error: any) {
             if (error.message.includes('token')) { // Simple check for expired token
                handleRefreshToken();
             } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao buscar saldo',
                    description: error.message || 'Não foi possível buscar o saldo.'
                });
             }
        } finally {
            setIsLoading(false);
        }
    }

    const handleRefreshToken = async () => {
        if (!user || !firestore) return;
        setIsLoading(true);
        try {
            const newTokenData = await refreshCoraToken(token.refreshToken);
            const newExpiresAt = Timestamp.fromMillis(Date.now() + newTokenData.expires_in * 1000);
            
            const newToken: Partial<CoraToken> = {
                accessToken: newTokenData.access_token,
                expiresAt: newExpiresAt
            };
            
            const tokenDocRef = doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
            setDocumentNonBlocking(tokenDocRef, newToken, { merge: true });

            toast({ title: 'Token atualizado!', description: 'Seu token de acesso foi atualizado. Tentando buscar saldo novamente.' });
            
            // Retry getting balance with the new token
            await handleGetBalance(newTokenData.access_token);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Falha ao atualizar token', description: e.message });
            setIsLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Conta Cora Conectada</CardTitle>
                <CardDescription>Sua conta está conectada. Use as ações abaixo para interagir com a API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="rounded-md border p-4">
                    <h3 className="font-semibold mb-2">Saldo da Conta</h3>
                    {balance === null ? (
                        <p className="text-muted-foreground">Clique no botão para buscar seu saldo atual.</p>
                    ) : (
                        <p className="text-2xl font-bold text-primary">{formatCurrency(balance)}</p>
                    )}
                 </div>
                <Button onClick={() => handleGetBalance(token.accessToken)} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Buscando...' : 'Buscar Saldo'}
                </Button>
            </CardContent>
        </Card>
    )
}


function ApiBankContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const coraTokenRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid, 'coraTokens', 'cora-token');
  }, [firestore, user]);

  const { data: coraToken, isLoading: isTokenLoading } = useDoc<CoraToken>(coraTokenRef);

  const isLoading = isUserLoading || isTokenLoading;

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          API BANK (BETA)
        </h1>
        <p className="text-muted-foreground">
          Conecte suas contas e automatize suas finanças.
        </p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha na Conexão</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao tentar conectar com a Cora: {error}
          </AlertDescription>
        </Alert>
      )}

      {coraToken ? <CoraAccountDetails token={coraToken} /> : <CoraAuthForm />}

    </div>
  );
}

export default function ApiBankPage() {
    return (
        <AppLayout>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                 <ApiBankContent />
            </Suspense>
        </AppLayout>
    )
}
