'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { CoraAuthForm } from '@/components/cora/cora-auth-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function ApiBankContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

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

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Conexão bem-sucedida!</AlertTitle>
          <AlertDescription>
            Sua conta Cora foi conectada. Em breve você verá suas transações aqui.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha na Conexão</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao tentar conectar com a Cora: {error}
          </AlertDescription>
        </Alert>
      )}

      {!success && <CoraAuthForm />}

    </div>
  );
}

export default function ApiBankPage() {
    return (
        <AppLayout>
            <Suspense fallback={<div>Carregando...</div>}>
                 <ApiBankContent />
            </Suspense>
        </AppLayout>
    )
}
