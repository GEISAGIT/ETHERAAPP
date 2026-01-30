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
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
