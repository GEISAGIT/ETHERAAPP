'use client';
import { transactions, budgets } from '@/lib/data';
import { StatsCards } from './stats-cards';
import { OverviewChart } from './overview-chart';
import { RecentTransactions } from './recent-transactions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

export function DashboardClient() {
  const overspentBudgets = budgets.filter(b => b.spent > b.amount);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Painel
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Aqui está um resumo das finanças da sua clínica.
        </p>
      </header>

      {overspentBudgets.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alerta de Orçamento!</AlertTitle>
          <AlertDescription>
            Você excedeu seu orçamento para:{' '}
            {overspentBudgets.map(b => b.name).join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      <StatsCards transactions={transactions} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart transactions={transactions} />
        </div>
        <RecentTransactions transactions={transactions} />
      </div>
    </div>
  );
}
