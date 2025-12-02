import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

type StatsCardsProps = {
  transactions: Transaction[];
};

export function StatsCards({ transactions }: StatsCardsProps) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

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
      icon: DollarSign,
      color: netProfit >= 0 ? 'text-emerald-500' : 'text-red-500',
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

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
              do último mês
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
