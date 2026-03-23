import type { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '../ui/button';

type RecentTransactionsProps = {
  transactions: Transaction[];
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recentTransactions = transactions.slice(0, 5);

  const formatCurrency = (value: number, type: 'income' | 'expense') => {
    const sign = type === 'income' ? '+' : '-';
    return `${sign}${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline text-xl">Transações Recentes</CardTitle>
            <CardDescription>
              Suas últimas 5 atividades financeiras.
            </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
            <Link href="/transactions">Ver todas</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex h-full min-h-60 items-center justify-center">
            <p className="text-muted-foreground">Nenhuma transação ainda.</p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
