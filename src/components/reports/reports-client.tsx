'use client';
import type { Transaction, ExpenseTransaction } from '@/lib/types';
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
  const { totalIncome, totalExpenses, netProfit, expensesByGroup } = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    const expensesByGroup: { [group: string]: { total: number, categories: { [category: string]: number } } } = {};

    data.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
        const expense = t as ExpenseTransaction;
        const groupName = expense.fullCategoryPath?.group || 'Sem Grupo';
        const categoryName = expense.fullCategoryPath?.category || 'Sem Categoria';

        if (!expensesByGroup[groupName]) {
            expensesByGroup[groupName] = { total: 0, categories: {} };
        }
        
        expensesByGroup[groupName].total += expense.amount;
        
        if (!expensesByGroup[groupName].categories[categoryName]) {
            expensesByGroup[groupName].categories[categoryName] = 0;
        }

        expensesByGroup[groupName].categories[categoryName] += expense.amount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expensesByGroup,
    };

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
                <Skeleton className="h-96" />
                <Skeleton className="h-96" />
            </div>
        </div>
    )
  }

  const sortedGroups = Object.keys(expensesByGroup).sort((a,b) => expensesByGroup[b].total - expensesByGroup[a].total);


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
        
      <div>
        <h2 className="font-headline text-2xl font-bold tracking-tight mb-4">Detalhamento de Despesas por Grupo</h2>
        {sortedGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Nenhuma despesa registrada ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {sortedGroups.map((groupName) => {
              const groupData = expensesByGroup[groupName];
              const chartData = Object.entries(groupData.categories).map(([name, value]) => ({ name, value }));

              return (
                <Card key={groupName}>
                  <CardHeader>
                    <CardTitle className="font-headline">{groupName}</CardTitle>
                    <CardDescription>Total do Grupo: {formatCurrency(groupData.total)}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className='h-[200px]'>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.sort((a,b) => b.value - a.value).map(item => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium truncate max-w-28">{item.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
