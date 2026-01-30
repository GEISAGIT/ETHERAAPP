'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ApiBankPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            API BANK (BETA)
          </h1>
          <p className="text-muted-foreground">
            Conecte suas contas e automatize suas finanças.
          </p>
        </header>
        <Card>
            <CardHeader>
                <CardTitle>Em Breve</CardTitle>
                <CardDescription>Esta funcionalidade ainda está em desenvolvimento.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>A integração com a API Bank permitirá que você conecte suas contas bancárias diretamente à Ethera, automatizando o registro de receitas e despesas e fornecendo uma visão ainda mais completa da sua saúde financeira.</p>
                <p className="mt-4 rounded-md border border-amber-500 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <span className="font-bold">Atenção:</span> Este é um ambiente de teste (homologação). As alterações aqui não afetam o seu aplicativo em produção.
                </p>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
