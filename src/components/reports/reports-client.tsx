'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../ui/table';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

export function ReportsClient({ data }: { data: Transaction[] }) {
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
  

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Financial Reports
        </h1>
        <p className="text-muted-foreground">
          Analyze your clinic's financial performance.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Profit &amp; Loss Summary</CardTitle>
            <CardDescription>A summary of your income and expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">Total Income</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totalIncome)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-medium">Total Expenses</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableHead>Net Profit</TableHead>
                        <TableHead className={`text-right ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netProfit)}</TableHead>
                    </TableRow>
                </TableFooter>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Expense Breakdown</CardTitle>
            <CardDescription>How your expenses are distributed.</CardDescription>
          </CardHeader>
          <CardContent>
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
                }}/>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
