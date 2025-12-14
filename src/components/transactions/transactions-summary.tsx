'use client';
import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Banknote } from 'lucide-react';
import { useMemo } from 'react';

type TransactionsSummaryProps = {
  transactions: Transaction[];
};

export function TransactionsSummary({ transactions }: TransactionsSummaryProps) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const { totalIncome, totalExpenses } = useMemo(() => {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
        
    return {
        totalIncome: income,
        totalExpenses: expenses,
    };
  }, [transactions]);

  const netProfit = totalIncome - totalExpenses;

  const stats = [
    {
      title: 'Receita (Filtrado)',
      value: totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'Despesa (Filtrado)',
      value: totalExpenses,
      icon: TrendingDown,
      color: 'text-red-500',
    },
    {
      title: 'Saldo (Filtrado)',
      value: netProfit,
      icon: Banknote,
      color: netProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              Total de {transactions.length} transações exibidas
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
