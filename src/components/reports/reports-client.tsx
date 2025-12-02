'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../ui/table';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d',
  '#ffc658'
];

export function ReportsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  const { expenseData, totalIncome, totalExpenses, netProfit } = useMemo(() => {
    const expensesByCategory: { [key: string]: number } = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    data.forEach(t => {
      if (t.type === 'expense') {
        if (!expensesByCategory[t.category]) {
          expensesByCategory[t.category] = 0;
        }
        expensesByCategory[t.category] += t.amount;
        totalExpenses += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });
    
    const expenseData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

    return {
      expenseData,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses
    };

  }, [data]);
  
  if (isLoading) {
    return (
        <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-80" />
                <Skeleton className="h-5 w-96 mt-2" />
            </header>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <Skeleton className="lg:col-span-3 h-56" />
                <Skeleton className="lg:col-span-2 h-96" />
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Resumo de Lucros e Perdas</CardTitle>
            <CardDescription>Um resumo de suas receitas e despesas.</CardDescription>
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
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Detalhamento de Despesas</CardTitle>
            <CardDescription>Como suas despesas são distribuídas.</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseData.length === 0 ? (
                 <div className="flex h-[300px] items-center justify-center">
                    <p className="text-muted-foreground">Nenhuma despesa registrada.</p>
                 </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
