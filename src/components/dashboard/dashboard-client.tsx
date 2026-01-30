'use client';
import type { Transaction, Budget, ExpenseTransaction, Contract } from '@/lib/types';
import { StatsCards } from './stats-cards';
import { OverviewChart } from './overview-chart';
import { RecentTransactions } from './recent-transactions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CalendarIcon } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useState, useMemo } from 'react';
import { DrilldownExpenseChart } from './drilldown-expense-chart';
import { isWithinInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { ContractsOverview } from './contracts-overview';
import { Badge } from '@/components/ui/badge';


export function DashboardClient({ transactions, budgets, contracts, expenses, isLoading }: { transactions: Transaction[], budgets: Budget[], contracts: Contract[], expenses: ExpenseTransaction[], isLoading: boolean }) {
  const [filterDate, setFilterDate] = useState<DateRange | undefined>(undefined);

  const filteredTransactions = useMemo(() => {
    if (!filterDate?.from) {
        return transactions;
    }
    
    // Set 'to' to be the end of the selected day if it's not set
    const toDate = filterDate.to || new Date(filterDate.from.getFullYear(), filterDate.from.getMonth(), filterDate.from.getDate(), 23, 59, 59);

    return transactions.filter(t => {
      const transactionDate = t.date.toDate();
      return isWithinInterval(transactionDate, { start: filterDate.from!, end: toDate });
    });
  }, [transactions, filterDate]);


  const filteredExpenses = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'expense') as ExpenseTransaction[];
  }, [filteredTransactions]);


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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <Skeleton className="lg:col-span-1 h-[422px]" />
                <Skeleton className="h-[422px]" />
            </div>
            <div className="grid grid-cols-1 gap-8">
                <Skeleton className="h-[450px]" />
                <Skeleton className="h-[450px]" />
            </div>
        </div>
    )
  }
  
  const overspentBudgets = budgets.filter(b => b.spent > b.amount);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              Painel
            </h1>
          </div>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está um resumo das finanças da sua clínica.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal sm:w-auto",
                !filterDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filterDate?.from ? (
                filterDate.to ? (
                  <>
                    {format(filterDate.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(filterDate.to, "LLL dd, y", { locale: ptBR })}
                  </>
                ) : (
                  format(filterDate.from, "LLL dd, y", { locale: ptBR })
                )
              ) : (
                <span>Todo o Período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filterDate?.from}
              selected={filterDate}
              onSelect={setFilterDate}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
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

      <StatsCards transactions={filteredTransactions} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <OverviewChart transactions={transactions} />
        <RecentTransactions transactions={transactions} />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <DrilldownExpenseChart expenses={filteredExpenses} />
        <ContractsOverview contracts={contracts} expenses={expenses} />
      </div>
    </div>
  );
}
