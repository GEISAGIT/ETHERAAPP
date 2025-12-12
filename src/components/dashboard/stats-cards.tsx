'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Banknote } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfToday, endOfToday } from 'date-fns';
import type { StatsPeriod } from './dashboard-client';
import { useMemo } from 'react';

type StatsCardsProps = {
  transactions: Transaction[];
  period: StatsPeriod;
};

export function StatsCards({ transactions, period }: StatsCardsProps) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const { totalIncome, totalExpenses, description } = useMemo(() => {
    const now = new Date();
    let descriptionText = 'Desde o início';
    let filteredTransactions = transactions;

    if (period === 'thisMonth') {
        const start = startOfMonth(now);
        const end = endOfToday(); // Use end of today to include all of today's transactions
        filteredTransactions = transactions.filter(t => isWithinInterval(t.date.toDate(), { start, end }));
        descriptionText = 'Este Mês';
    } else if (period === 'lastMonth') {
        const lastMonth = subMonths(now, 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);
        filteredTransactions = transactions.filter(t => isWithinInterval(t.date.toDate(), { start, end }));
        descriptionText = 'Último Mês';
    }
    
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
        
    return {
        totalIncome: income,
        totalExpenses: expenses,
        description: descriptionText
    };
  }, [transactions, period]);

  const netProfit = totalIncome - totalExpenses;

  const stats = [
    {
      title: 'Receita Total',
      value: totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'Despesa Total',
      value: totalExpenses,
      icon: TrendingDown,
      color: 'text-red-500',
    },
    {
      title: 'Lucro Líquido',
      value: netProfit,
      icon: Banknote,
      color: netProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map(stat => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {formatCurrency(stat.value)}
            </div>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
