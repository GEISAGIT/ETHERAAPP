'use client';
import type { Budget } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function BudgetsClient({ data }: { data: Budget[] }) {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Orçamentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus gastos mensais e mantenha-se no caminho certo.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(budget => {
          const progress = (budget.spent / budget.amount) * 100;
          const remaining = budget.amount - budget.spent;
          const isOverspent = progress > 100;
          
          let progressColor;
          if (isOverspent) {
            progressColor = "bg-red-500";
          } else if (progress > 80) {
            progressColor = "bg-yellow-500";
          } else {
            progressColor = "bg-primary";
          }
          
          return (
            <Card key={budget.id}>
              <CardHeader>
                <CardTitle className="font-headline">{budget.name}</CardTitle>
                <CardDescription>
                  Orçado: {formatCurrency(budget.amount)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={Math.min(progress, 100)} className="h-2 [&>div]:bg-primary" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Gasto: {formatCurrency(budget.spent)}</span>
                    <span className={isOverspent ? 'font-bold text-red-500' : ''}>
                      {isOverspent ? 'Acima do orçamento' : `Restante: ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <span className={`text-sm font-medium ${isOverspent ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {Math.round(progress)}% do orçamento utilizado
                  </span>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
