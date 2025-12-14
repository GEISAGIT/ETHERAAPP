'use client';
import type { Contract } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarCheck, FileText, Forward } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { addMonths, addYears, format, differenceInDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value?: number) => {
    if (value === undefined) return 'Variável';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const frequencyFunctionMap = {
    monthly: (date: Date, count: number) => addMonths(date, count),
    bimonthly: (date: Date, count: number) => addMonths(date, count * 2),
    quarterly: (date: Date, count: number) => addMonths(date, count * 3),
    semiannually: (date: Date, count: number) => addMonths(date, count * 6),
    annually: (date: Date, count: number) => addYears(date, count),
};

const getNextDueDate = (contract: Contract): Date | null => {
    const today = new Date();
    const { paymentFrequency, paymentDueDate, createdAt, expirationDate } = contract;

    if (!paymentDueDate) return null;

    let nextDate = new Date(createdAt.toDate());
    nextDate.setDate(paymentDueDate);
    
    while (isAfter(today, nextDate)) {
        nextDate = frequencyFunctionMap[paymentFrequency](nextDate, 1);
    }
    
    if (expirationDate && isAfter(nextDate, expirationDate.toDate())) {
        return null;
    }

    return nextDate;
};


export function ContractsOverview({ contracts }: { contracts: Contract[] }) {
  
  const expiringSoonContracts = useMemo(() => {
    const today = new Date();
    return contracts.filter(contract => {
      if (!contract.expirationDate) return false;
      const daysUntilExpiration = differenceInDays(contract.expirationDate.toDate(), today);
      return daysUntilExpiration >= 0 && daysUntilExpiration <= 30;
    });
  }, [contracts]);

  const upcomingPayments = useMemo(() => {
    return contracts.map(contract => ({
        ...contract,
        nextDueDate: getNextDueDate(contract)
    }))
    .filter(payment => payment.nextDueDate !== null)
    .sort((a, b) => a.nextDueDate!.getTime() - b.nextDueDate!.getTime())
    .slice(0, 3); // Get the next 3 upcoming payments
  }, [contracts]);


  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle className="font-headline text-xl">Visão de Contratos</CardTitle>
                <CardDescription>Resumo de seus compromissos recorrentes.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-bold">{contracts.length}</span>
                <span className="text-sm text-muted-foreground">Contratos Ativos</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">

        {expiringSoonContracts.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-amber-700 dark:text-amber-400">Contratos Expirando</h4>
                        <p className="text-sm text-amber-600 dark:text-amber-500">
                           {expiringSoonContracts.map(c => c.name).join(', ')}
                           {expiringSoonContracts.length > 1 ? ' estão' : ' está'} perto do vencimento.
                        </p>
                    </div>
                </div>
            </div>
        )}

        <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CalendarCheck className="h-4 w-4" />
                Próximos Vencimentos
            </h4>
             {upcomingPayments.length > 0 ? (
                 <div className="space-y-3">
                    {upcomingPayments.map(payment => (
                         <div key={payment.id} className="flex items-center justify-between rounded-md border p-3">
                             <div className="flex-1">
                                 <p className="font-medium">{payment.name}</p>
                                 <p className="text-xs text-muted-foreground">{format(payment.nextDueDate!, "dd 'de' MMMM", { locale: ptBR })}</p>
                             </div>
                             <Badge variant="secondary">{formatCurrency(payment.amount)}</Badge>
                         </div>
                    ))}
                 </div>
             ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">Nenhum vencimento futuro encontrado.</p>
                </div>
             )}
        </div>
      </CardContent>
       <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/settings/contracts">
                    Gerenciar todos os contratos
                    <Forward className="ml-2 h-4 w-4" />
                </Link>
            </Button>
      </CardFooter>
    </Card>
  );
}
