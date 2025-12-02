'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';

type OverviewChartProps = {
  transactions: Transaction[];
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
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
              }}
              formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
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
