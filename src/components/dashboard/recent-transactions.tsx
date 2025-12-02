import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type RecentTransactionsProps = {
  transactions: Transaction[];
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const formatCurrency = (value: number, type: 'income' | 'expense') => {
    const sign = type === 'income' ? '+' : '-';
    return `${sign}${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">Transações Recentes</CardTitle>
        <CardDescription>
          Suas últimas atividades financeiras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map(t => (
            <div key={t.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {t.description.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-4 flex-1 space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {t.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t.category}
                </p>
              </div>
              <div
                className={`ml-auto font-medium text-sm ${
                  t.type === 'income' ? 'text-emerald-500' : 'text-foreground'
                }`}
              >
                {formatCurrency(t.amount, t.type)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
