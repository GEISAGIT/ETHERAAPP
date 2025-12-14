'use client';
import type { Contract } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addMonths, addYears, format, isAfter, startOfDay, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { PayRecurringTransactionDialog } from './pay-recurring-transaction-dialog';

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
    if (contract.status !== 'active') return null;

    const today = startOfDay(new Date());
    const { paymentFrequency, paymentDueDate, createdAt, expirationDate } = contract;

    if (!paymentDueDate) return null;

    let dueDateInCurrentCycle = new Date(today.getFullYear(), today.getMonth(), paymentDueDate);

    // If today is after this month's due date, the next cycle is next month
    if (isAfter(today, dueDateInCurrentCycle)) {
        dueDateInCurrentCycle = addMonths(dueDateInCurrentCycle, 1);
    }
    
    // Check if the contract was created after the cycle start. 
    // This handles contracts created mid-cycle.
    const cycleStartDate = startOfMonth(dueDateInCurrentCycle);
    if(isAfter(cycleStartDate, createdAt.toDate())) {
        let firstDueDate = new Date(createdAt.toDate());
        firstDueDate.setDate(paymentDueDate);
        // Find the very first due date after creation
        while(isBefore(firstDueDate, createdAt.toDate())) {
            firstDueDate = frequencyFunctionMap[paymentFrequency](firstDueDate, 1);
        }
        dueDateInCurrentCycle = firstDueDate;
    }

    // Ensure we are always looking at a future or present due date
    while (isBefore(dueDateInCurrentCycle, today)) {
        const nextPossibleDueDate = frequencyFunctionMap[paymentFrequency](dueDateInCurrentCycle, 1);
         // Safety break for logic errors
         if (isAfter(nextPossibleDueDate, dueDateInCurrentCycle)) {
            dueDateInCurrentCycle = nextPossibleDueDate;
        } else {
            break; 
        }
    }

    // Finally, check if the calculated next date is past the contract's expiration date.
    if (expirationDate && isAfter(dueDateInCurrentCycle, expirationDate.toDate())) {
        return null;
    }

    return dueDateInCurrentCycle;
};


export function RecurringTransactions({ contracts }: { contracts: Contract[] }) {
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<{contract: Contract, dueDate: Date} | null>(null);

    const upcomingPayments = useMemo(() => {
        return contracts
            .map(contract => ({
                ...contract,
                nextDueDate: getNextDueDate(contract)
            }))
            .filter((payment): payment is typeof payment & { nextDueDate: Date } => payment.nextDueDate !== null)
            .sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
    }, [contracts]);


    const handlePayClick = (contract: Contract, dueDate: Date) => {
        setSelectedPayment({ contract, dueDate });
        setIsPayDialogOpen(true);
    };

    return (
        <>
            <PayRecurringTransactionDialog 
                open={isPayDialogOpen}
                onOpenChange={setIsPayDialogOpen}
                payment={selectedPayment}
            />
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Vencimentos</CardTitle>
                    <CardDescription>
                        Estas são as suas próximas contas recorrentes baseadas nos seus contratos ativos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingPayments.length === 0 ? (
                        <div className="flex h-40 items-center justify-center text-center">
                            <p className="text-muted-foreground">
                                Nenhum contrato ativo com vencimentos futuros encontrado.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingPayments.map(payment => (
                                <div key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-md border p-4">
                                    <div className="flex-1">
                                        <p className="font-semibold">{payment.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {payment.fullCategoryPath?.description || 'Sem categoria'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                                        <div className="flex items-center justify-between sm:justify-start gap-4">
                                            <Badge variant="outline">{formatCurrency(payment.amount)}</Badge>
                                            <p className="text-sm font-medium">
                                                Vence em: {payment.nextDueDate ? format(payment.nextDueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                                            </p>
                                        </div>
                                    <div className="flex items-center justify-between sm:justify-start gap-4">
                                        <Badge>Pendente</Badge>
                                        <Button size="sm" onClick={() => handlePayClick(payment, payment.nextDueDate!)}>
                                            Pagar
                                        </Button>
                                    </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
