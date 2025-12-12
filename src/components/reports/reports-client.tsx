'use client';
import type { Transaction, ExpenseTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { DrilldownExpenseChart } from '../dashboard/drilldown-expense-chart';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
export function ReportsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  
  const { totalIncome, totalExpenses, netProfit, expenseTransactions } = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expenseTransactions: ExpenseTransaction[] = [];

    data.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
        expenseTransactions.push(t as ExpenseTransaction);
      }
    });

    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, expenseTransactions };

  }, [data]);
  
  if (isLoading) {
    return (
        <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-80" />
                <Skeleton className="h-5 w-96 mt-2" />
            </header>
            <div className="grid grid-cols-1 gap-8">
                <Skeleton className="h-56" />
                <Skeleton className="h-[450px]" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Relatórios Financeiros
        </h1>
        <p className="text-muted-foreground">
          Analise o desempenho financeiro da sua clínica.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Resumo de Lucros e Perdas</CardTitle>
          <CardDescription>Um resumo de suas receitas e despesas totais.</CardDescription>
        </CardHeader>
        <CardContent>
         {data.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">Nenhum dado para exibir.</p>
              </div>
         ) : (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  <TableRow>
                      <TableCell className="font-medium">Receita Total</TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</TableCell>
                  </TableRow>
                  <TableRow>
                      <TableCell className="font-medium">Despesa Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                  </TableRow>
              </TableBody>
              <TableFooter>
                  <TableRow>
                      <TableHead>Lucro Líquido</TableHead>
                      <TableHead className={`text-right ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netProfit)}</TableHead>
                  </TableRow>
              </TableFooter>
          </Table>
         )}
        </CardContent>
      </Card>
        
      <DrilldownExpenseChart expenses={expenseTransactions} />
    </div>
  );
}
