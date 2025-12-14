
'use client';
import type { Contract, ExpenseTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Forward, XCircle, CalendarOff, AlertCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { addMonths, addYears, format, differenceInDays, isAfter, isBefore, startOfDay, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
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

type PaymentStatus = {
    status: 'Vencido' | 'Vence hoje' | 'Vence em breve' | 'Em dia';
    daysRemaining: number;
    dueDate: Date;
    isDue: boolean;
};

const getPaymentStatus = (contract: Contract): PaymentStatus | null => {
    if (contract.status !== 'active') return null;

    const today = startOfDay(new Date());
    const { paymentFrequency, paymentDueDate, createdAt, expirationDate } = contract;

    if (!paymentDueDate) return null;

    let dueDateInCycle = new Date(today.getFullYear(), today.getMonth(), paymentDueDate);
    
    if (isAfter(today, dueDateInCycle) && isAfter(today, createdAt.toDate())) {
      dueDateInCycle = frequencyFunctionMap[paymentFrequency](dueDateInCycle, 1);
    } else if (isBefore(today, createdAt.toDate())) {
      let firstDueDate = new Date(createdAt.toDate());
      firstDueDate.setDate(paymentDueDate);
       while(isBefore(firstDueDate, createdAt.toDate())) {
          firstDueDate = frequencyFunctionMap[paymentFrequency](firstDueDate, 1);
      }
      dueDateInCycle = firstDueDate;
    }

    while (isBefore(dueDateInCycle, today)) {
        const nextPossibleDueDate = frequencyFunctionMap[paymentFrequency](dueDateInCycle, 1);
        if (isAfter(nextPossibleDueDate, dueDateInCycle)) {
            dueDateInCycle = nextPossibleDueDate;
        } else {
            break;
        }
    }
    
    if (expirationDate && isAfter(dueDateInCycle, expirationDate.toDate())) {
        return null;
    }

    const daysRemaining = differenceInDays(dueDateInCycle, today);

    let status: 'Vencido' | 'Vence hoje' | 'Vence em breve' | 'Em dia' = 'Em dia';
    if (daysRemaining < 0) {
        status = 'Vencido';
    } else if (daysRemaining === 0) {
        status = 'Vence hoje';
    } else if (daysRemaining <= 10) {
        status = 'Vence em breve';
    }

    return {
        status,
        daysRemaining,
        dueDate: dueDateInCycle,
        isDue: true,
    };
};

export function ContractsOverview({ contracts, expenses }: { contracts: Contract[], expenses: ExpenseTransaction[] }) {
  
  const activeContracts = useMemo(() => contracts.filter(c => c.status === 'active' || c.status === undefined), [contracts]);

  const paymentPendencies = useMemo(() => {
    return activeContracts.map(contract => {
        const paymentStatus = getPaymentStatus(contract);
        if (!paymentStatus) return null;

        // Check if paid
        const cycleStart = startOfMonth(paymentStatus.dueDate);
        const cycleEnd = endOfMonth(paymentStatus.dueDate);
        const isPaid = expenses.some(expense => 
            expense.description === contract.name &&
            isWithinInterval(expense.date.toDate(), { start: cycleStart, end: cycleEnd })
        );

        if (isPaid) return null;

        return {
            ...contract,
            paymentStatus
        }
    })
    .filter((p): p is typeof p & { paymentStatus: PaymentStatus } => p !== null)
    .sort((a, b) => a.paymentStatus.dueDate.getTime() - b.paymentStatus.dueDate.getTime());
  }, [activeContracts, expenses]);

  const contractsWithExpiration = useMemo(() => {
    const today = new Date();
    return activeContracts
      .filter(contract => contract.expirationDate)
      .map(contract => {
        const daysRemaining = differenceInDays(contract.expirationDate!.toDate(), today);
        return { ...contract, daysRemaining };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [activeContracts]);

  const overdueCount = paymentPendencies.filter(p => p.paymentStatus?.status === 'Vencido').length;

  const getStatusComponent = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus.status) {
        case 'Vencido':
            return (
                <div className="flex items-center gap-1.5 font-semibold text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span>Vencido</span>
                </div>
            );
        case 'Vence hoje':
             return (
                <div className="flex items-center gap-1.5 font-semibold text-amber-600">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>Vence hoje!</span>
                </div>
            );
        case 'Vence em breve':
            return (
                <div className="flex items-center gap-1.5 font-semibold text-amber-600">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>Vence em {paymentStatus.daysRemaining} dias</span>
                </div>
            );
        default:
            return (
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Em dia</span>
                </div>
            );
    }
  }


  return (
    <>
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle className="font-headline text-xl">Pendências de Pagamento</CardTitle>
                <CardDescription>Resumo de seus compromissos recorrentes.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-xl font-bold">{activeContracts.length}</span>
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
                                 {getStatusComponent(item.paymentStatus)}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <CalendarClock className="h-4 w-4" />
                                    <span>{format(item.paymentStatus.dueDate, "dd 'de' MMM", { locale: ptBR })}</span>
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

    <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl">Vigência de Contratos</CardTitle>
            <CardDescription>Contratos com data de encerramento definida.</CardDescription>
        </CardHeader>
        <CardContent>
            {contractsWithExpiration.length === 0 ? (
                 <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">Nenhum contrato com data de expiração.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {contractsWithExpiration.map(contract => {
                        const isExpiringSoon = contract.daysRemaining <= 30 && contract.daysRemaining >= 0;
                        const isExpired = contract.daysRemaining < 0;
                        return (
                            <div key={contract.id} className="flex flex-col sm:flex-row items-start justify-between rounded-md border p-3 gap-3">
                                <div className="flex-1">
                                    <p className="font-medium">{contract.name}</p>
                                     <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                        <CalendarOff className="h-4 w-4" />
                                        <span>
                                            {isExpired 
                                                ? `Venceu em ${format(contract.expirationDate!.toDate(), "dd/MM/yyyy")}`
                                                : `Vence em ${format(contract.expirationDate!.toDate(), "dd/MM/yyyy")}`
                                            }
                                        </span>
                                    </div>
                                    {isExpiringSoon && !isExpired && (
                                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
                                            <AlertCircleIcon className="h-4 w-4" />
                                            <span>Vence em {contract.daysRemaining} dias!</span>
                                        </div>
                                    )}
                                    {isExpired && (
                                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>Contrato Expirado</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-center">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/settings/contracts">Renovar</Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href="/settings/contracts">Cancelar</Link>
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </CardContent>
    </Card>
    </>
  );
}
