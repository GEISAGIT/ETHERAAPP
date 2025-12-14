'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type OverviewChartProps = {
  transactions: Transaction[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
      const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
      const profit = income - expense;

      const formatCurrency = (value: number) => 
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);

      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                    {label}
                </span>
                <span className="font-bold text-muted-foreground">
                    Receitas
                </span>
                <span className="font-bold text-muted-foreground">
                    Despesas
                </span>
                <span className="font-bold">
                    Lucro
                </span>
            </div>
            <div className="flex flex-col space-y-1 text-right">
                <span className="text-[0.70rem] uppercase text-muted-foreground">
                    &nbsp;
                </span>
                <span className="font-bold text-emerald-500">
                    {formatCurrency(income)}
                </span>
                <span className="font-bold">
                    {formatCurrency(expense)}
                </span>
                <span className={cn("font-bold", profit >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {formatCurrency(profit)}
                </span>
            </div>
          </div>
        </div>
      );
    }
  
    return null;
  };

export function OverviewChart({ transactions }: OverviewChartProps) {
  const data = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    
    transactions.forEach(t => {
      const month = t.date.toDate().toLocaleString('pt-BR', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
      } else {
        monthlyData[month].expense += t.amount;
      }
    });

    // Ensure we have data for the last 6 months, even if it's zero
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push(d.toLocaleString('pt-BR', { month: 'short' }));
    }
    
    return last6Months.map(monthName => {
        return {
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            income: monthlyData[monthName]?.income || 0,
            expense: monthlyData[monthName]?.expense || 0,
        }
    });

  }, [transactions]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Visão Geral</CardTitle>
        <CardDescription>Receitas vs. Despesas (Últimos 6 meses)</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<CustomTooltip />}
            />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Receitas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="hsl(var(--chart-2))" name="Despesas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
