'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { Bell, Info, Megaphone, Calendar } from 'lucide-react';

export default function HomePage() {
  const { user } = useUser();

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
            Bem-vindo, {user?.displayName?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-muted-foreground">
            Aqui estão as últimas novidades e comunicados da Ethera.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary font-headline">
                <Megaphone className="h-5 w-5" />
                Comunicado Geral
              </CardTitle>
              <CardDescription>Publicado hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Seja bem-vindo ao novo portal Ethera. Estamos em fase beta de integração com serviços bancários e recursos humanos. 
                Fique atento às atualizações periódicas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Calendar className="h-5 w-5 text-primary" />
                Lembrete
              </CardTitle>
              <CardDescription>RH & Folha</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Não esqueça de conferir seus registros de ponto no novo módulo de Recursos Humanos ao final de cada jornada.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Info className="h-5 w-5 text-primary" />
                Dica de Segurança
              </CardTitle>
              <CardDescription>Segurança de Dados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nunca compartilhe sua senha de acesso ou tokens de autenticação bancária com terceiros.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-headline flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações Recentes
          </h2>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Módulo Financeiro atualizado</p>
                <p className="text-xs text-muted-foreground text-pretty">
                  Novas categorias hierárquicas de despesas foram adicionadas para facilitar sua gestão.
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">2 horas atrás</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
