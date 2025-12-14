'use client';
import type { Contract } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Forward, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { addMonths, addYears, format, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

type PaymentStatus = {
    status: 'Vencido' | 'Em dia' | 'Vence hoje';
    dueDate: Date;
    isDue: boolean;
};

const getPaymentStatus = (contract: Contract): PaymentStatus | null => {
    const today = startOfDay(new Date());
    const { paymentFrequency, paymentDueDate, createdAt, expirationDate } = contract;

    if (!paymentDueDate) return null;

    let dueDateInCurrentCycle = new Date(today.getFullYear(), today.getMonth(), paymentDueDate);

    // If today is already past the due date this month, the cycle we care about is next month's due date
    if (isAfter(today, dueDateInCurrentCycle)) {
        dueDateInCurrentCycle = addMonths(dueDateInCurrentCycle, 1);
    }
    
    // Check if the contract was even active at the start of this cycle
    const cycleStartDate = startOfMonth(dueDateInCurrentCycle);
    if(isAfter(cycleStartDate, createdAt.toDate())) {
        // Find the very first due date
        let firstDueDate = new Date(createdAt.toDate());
        firstDueDate.setDate(paymentDueDate);
        while(isBefore(firstDueDate, createdAt.toDate())) {
            firstDueDate = frequencyFunctionMap[paymentFrequency](firstDueDate, 1);
        }
        dueDateInCurrentCycle = firstDueDate;
    }


    while (isBefore(dueDateInCurrentCycle, today)) {
        const nextPossibleDueDate = frequencyFunctionMap[paymentFrequency](dueDateInCurrentCycle, 1);
         if (isAfter(nextPossibleDueDate, dueDateInCurrentCycle)) {
            dueDateInCurrentCycle = nextPossibleDueDate;
        } else {
            break; 
        }
    }

    if (expirationDate && isAfter(dueDateInCurrentCycle, expirationDate.toDate())) {
        return null;
    }
    
    const dueDateStartOfDay = startOfDay(dueDateInCurrentCycle);
    const isOverdue = isBefore(dueDateStartOfDay, today);

    let status: 'Vencido' | 'Em dia' | 'Vence hoje' = 'Em dia';
    if(isOverdue) status = 'Vencido';

    // This check is simplified, assuming a monthly cycle for "Vencido" status.
    // A more robust solution would check if a payment for the "current period" was made.
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    let isDueInCurrentMonth = isAfter(dueDateInCurrentCycle, startOfCurrentMonth) && isBefore(dueDateInCurrentCycle, endOfCurrentMonth);


    return {
        status: status,
        dueDate: dueDateInCurrentCycle,
        isDue: true, // Simplified for now
    };
};


export function ContractsOverview({ contracts }: { contracts: Contract[] }) {
  
  const paymentPendencies = useMemo(() => {
    return contracts.map(contract => ({
        ...contract,
        paymentStatus: getPaymentStatus(contract)
    }))
    .filter(p => p.paymentStatus !== null)
    .sort((a, b) => {
        // Vencidos primeiro, depois por data de vencimento
        if (a.paymentStatus!.status === 'Vencido' && b.paymentStatus!.status !== 'Vencido') return -1;
        if (a.paymentStatus!.status !== 'Vencido' && b.paymentStatus!.status === 'Vencido') return 1;
        return a.paymentStatus!.dueDate.getTime() - b.paymentStatus!.dueDate.getTime();
    });
  }, [contracts]);

  const overdueCount = paymentPendencies.filter(p => p.paymentStatus?.status === 'Vencido').length;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle className="font-headline text-xl">Pendências de Pagamento</CardTitle>
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

        {overdueCount > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-destructive">Você possui {overdueCount} {overdueCount > 1 ? 'pendências vencidas' : 'pendência vencida'}!</h4>
                        <p className="text-sm text-destructive/80">
                           Regularize os pagamentos para manter suas contas em dia.
                        </p>
                         <Button asChild variant="destructive" size="sm" className="mt-2">
                            <Link href="/settings/contracts">
                                Gerenciar Contratos
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        )}

        <div>
             {paymentPendencies.length > 0 ? (
                 <div className="space-y-3">
                    {paymentPendencies.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row items-start justify-between rounded-md border p-3 gap-2">
                             <div className="flex-1">
                                 <p className="font-medium">{item.name}</p>
                                 <p className="text-xs text-muted-foreground">
                                     Vigência: {item.expirationDate ? `Até ${format(item.expirationDate.toDate(), 'dd/MM/yy')}` : 'Indeterminada'}
                                </p>
                             </div>
                             <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between">
                                <Badge variant="secondary" className="font-mono">{formatCurrency(item.amount)}</Badge>
                                 {item.paymentStatus!.status === 'Vencido' ? (
                                    <div className="flex items-center gap-1.5 font-semibold text-red-500">
                                        <XCircle className="h-4 w-4" />
                                        <span>Vencido</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Em dia</span>
                                    </div>
                                 )}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CalendarClock className="h-4 w-4" />
                                    <span>{format(item.paymentStatus!.dueDate, "dd 'de' MMM", { locale: ptBR })}</span>
                                </div>
                             </div>
                         </div>
                    ))}
                 </div>
             ) : (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">Nenhuma pendência de pagamento encontrada.</p>
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
