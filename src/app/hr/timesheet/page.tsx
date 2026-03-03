'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Construction } from 'lucide-react';

export default function HRTimesheetPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Controle de Folha Ponto
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de horas e registros dos colaboradores.
          </p>
        </header>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle>Módulo em Desenvolvimento</CardTitle>
            <CardDescription>
              Estamos preparando as melhores ferramentas para gestão de ponto da sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Construction className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <p className="max-w-[420px] text-sm text-muted-foreground">
              Em breve você poderá visualizar registros, aprovar horas extras e gerenciar o calendário de trabalho diretamente por aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
