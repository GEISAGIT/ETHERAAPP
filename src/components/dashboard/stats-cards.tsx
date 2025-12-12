'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, CalendarClock, Banknote } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

type StatsCardsProps = {
  transactions: Transaction[];
};

export function StatsCards({ transactions }: StatsCardsProps) {
  const now = new Date();
  const oneMonthAgo = subMonths(now, 1);
  const startOfLastMonth = startOfMonth(oneMonthAgo);
  const endOfLastMonth = endOfMonth(oneMonthAgo);

  // All time calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  
  // Last month calculations
  const lastMonthTransactions = transactions.filter(t => {
      const transactionDate = t.date.toDate();
      return isWithinInterval(transactionDate, { start: startOfLastMonth, end: endOfLastMonth });
  });

  const lastMonthIncome = lastMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const lastMonthExpenses = lastMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const lastMonthProfit = lastMonthIncome - lastMonthExpenses;


  const stats = [
    {
      title: 'Receita Total (Geral)',
      value: totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-500',
      description: 'Desde o início',
    },
    {
      title: 'Despesa Total (Geral)',
      value: totalExpenses,
      icon: TrendingDown,
      color: 'text-red-500',
      description: 'Desde o início',
    },
    {
      title: 'Receita do Último Mês',
      value: lastMonthIncome,
      icon: CalendarClock,
      color: 'text-blue-500',
      description: `Ref. a ${format(startOfLastMonth, 'MMMM')}`,
    },
    {
      title: 'Lucro do Último Mês',
      value: lastMonthProfit,
      icon: Banknote,
      color: lastMonthProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
      description: `Ref. a ${format(startOfLastMonth, 'MMMM')}`,
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const format = (date: Date, formatStr: string) => {
      // Basic formatter to avoid locale dependency issues on server
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      if (formatStr === 'MMMM') {
          return months[date.getMonth()];
      }
      return date.toLocaleDateString('pt-BR');
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
