'use client';
import type { Contract, ExpenseTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addMonths, addYears, format, isAfter, startOfDay, isBefore, differenceInDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { PayRecurringTransactionDialog } from './pay-recurring-transaction-dialog';
import { AlertCircleIcon, CheckCircle2, XCircle } from 'lucide-react';

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

export function RecurringTransactions({ contracts, expenses }: { contracts: Contract[], expenses: ExpenseTransaction[] }) {
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<{contract: Contract, dueDate: Date} | null>(null);

    const upcomingPayments = useMemo(() => {
        const pendencies: (Contract & { paymentStatus: PaymentStatus })[] = [];
        const today = startOfDay(new Date());

        contracts.forEach(contract => {
            if (contract.status !== 'active' || !contract.paymentDueDate) return;

            const { paymentFrequency, paymentDueDate, createdAt, expirationDate } = contract;
            let searchDate = createdAt.toDate();

            while (true) {
                // Calculate potential due date for the current cycle
                let currentDueDate = new Date(searchDate.getFullYear(), searchDate.getMonth(), paymentDueDate);

                // If the calculated due date is before the start of the cycle (e.g. contract started mid-month), advance to the first real due date
                if (isBefore(currentDueDate, searchDate)) {
                    currentDueDate = frequencyFunctionMap[paymentFrequency](currentDueDate, 1);
                }

                // Stop if we're past expiration
                if (expirationDate && isAfter(currentDueDate, expirationDate.toDate())) {
                    break; // No more payments for this contract
                }
                
                // Stop if we are looking too far into the future (e.g. more than 1 year ahead) to avoid performance issues.
                if(differenceInDays(currentDueDate, today) > 365 * 2) {
                    break;
                }

                const cycleStart = startOfMonth(currentDueDate);
                const cycleEnd = endOfMonth(currentDueDate);
                const isPaid = expenses.some(expense => 
                    expense.description === contract.name &&
                    isWithinInterval(expense.date.toDate(), { start: cycleStart, end: cycleEnd })
                );

                if (!isPaid) {
                    // We found the first unpaid bill. This is our pendency.
                    const daysRemaining = differenceInDays(currentDueDate, today);
                    let status: 'Vencido' | 'Vence hoje' | 'Vence em breve' | 'Em dia' = 'Em dia';

                    if (daysRemaining < 0) {
                        status = 'Vencido';
                    } else if (daysRemaining === 0) {
                        status = 'Vence hoje';
                    } else if (daysRemaining <= 10) {
                        status = 'Vence em breve';
                    }
                    
                    pendencies.push({
                        ...contract,
                        paymentStatus: {
                            status,
                            daysRemaining,
                            dueDate: currentDueDate,
                            isDue: true,
                        }
                    });
                    break; // Found the first one, stop searching for this contract
                }

                // If paid, advance to the next cycle
                searchDate = frequencyFunctionMap[paymentFrequency](currentDueDate, 1);
            }
        });

        return pendencies.sort((a, b) => a.paymentStatus.dueDate.getTime() - b.paymentStatus.dueDate.getTime());
    }, [contracts, expenses]);


    const handlePayClick = (contract: Contract, dueDate: Date) => {
        setSelectedPayment({ contract, dueDate });
        setIsPayDialogOpen(true);
    };

    const getStatusComponent = (paymentStatus: PaymentStatus) => {
        switch (paymentStatus.status) {
            case 'Vencido':
                return (
                    <Badge variant="destructive" className="items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Vencido</span>
                    </Badge>
                );
            case 'Vence hoje':
                 return (
                    <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 items-center gap-1">
                        <AlertCircleIcon className="h-3.5 w-3.5" />
                        <span>Vence hoje!</span>
                    </Badge>
                );
            case 'Vence em breve':
                return (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700 items-center gap-1">
                        <AlertCircleIcon className="h-3.5 w-3.5" />
                        <span>Vence em {paymentStatus.daysRemaining} dias</span>
                    </Badge>
                );
            default:
                return (
                     <Badge variant="secondary" className="items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span>Em dia</span>
                    </Badge>
                );
        }
    }


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
                        Estas são as suas próximas contas recorrentes baseadas nos seus contratos ativos. Contas já pagas no ciclo atual não são exibidas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingPayments.length === 0 ? (
                        <div className="flex h-40 items-center justify-center text-center">
                            <p className="text-muted-foreground">
                                Nenhuma pendência de pagamento encontrada.
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
                                                Vence em: {payment.paymentStatus ? format(payment.paymentStatus.dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                                            </p>
                                        </div>
                                    <div className="flex items-center justify-between sm:justify-start gap-4">
                                        {getStatusComponent(payment.paymentStatus)}
                                        <Button size="sm" onClick={() => handlePayClick(payment, payment.paymentStatus.dueDate)}>
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
