'use client';
import type { Transaction, Budget, ExpenseTransaction } from '@/lib/types';
import { StatsCards } from './stats-cards';
import { OverviewChart } from './overview-chart';
import { RecentTransactions } from './recent-transactions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DrilldownExpenseChart } from './drilldown-expense-chart';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, endOfToday } from 'date-fns';

export type StatsPeriod = 'allTime' | 'thisMonth' | 'lastMonth';

export function DashboardClient({ transactions, budgets, isLoading }: { transactions: Transaction[], budgets: Budget[], isLoading: boolean }) {
  const [period, setPeriod] = useState<StatsPeriod>('allTime');

  const filteredExpenses = useMemo(() => {
    let filteredTransactions = transactions;

    if (period === 'thisMonth') {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfToday();
        filteredTransactions = transactions.filter(t => isWithinInterval(t.date.toDate(), { start, end }));
    } else if (period === 'lastMonth') {
        const now = new Date();
        const lastMonth = subMonths(now, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);
        filteredTransactions = transactions.filter(t => isWithinInterval(t.date.toDate(), { start, end }));
    }

    return filteredTransactions.filter(t => t.type === 'expense') as ExpenseTransaction[];
  }, [transactions, period]);


  if (isLoading) {
    return (
        <div className="flex flex-col gap-8">
             <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-96 mt-2" />
                </div>
                <Skeleton className="h-10 w-40" />
            </header>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <Skeleton className="lg:col-span-2 h-[422px]" />
                <Skeleton className="h-[422px]" />
            </div>
            <Skeleton className="h-[450px]" />
        </div>
    )
  }
  
  const overspentBudgets = budgets.filter(b => b.spent > b.amount);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Painel
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está um resumo das finanças da sua clínica.
          </p>
        </div>
        <Select value={period} onValueChange={(value: StatsPeriod) => setPeriod(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="allTime">Todo o Período</SelectItem>
                <SelectItem value="thisMonth">Este Mês</SelectItem>
                <SelectItem value="lastMonth">Último Mês</SelectItem>
            </SelectContent>
        </Select>
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

      <StatsCards transactions={transactions} period={period} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart transactions={transactions} />
        </div>
        <RecentTransactions transactions={transactions} />
      </div>
      <DrilldownExpenseChart expenses={filteredExpenses} />
    </div>
  );
}
