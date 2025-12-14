'use client';
import type { Contract } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addMonths, addYears, format, isAfter } from 'date-fns';
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
    
    // Move to the first due date that is after or on today
    while (isAfter(today, nextDate)) {
        nextDate = frequencyFunctionMap[paymentFrequency](nextDate, 1);
    }
    
    // Check if the calculated next date is past the contract's expiration date
    if (expirationDate && isAfter(nextDate, expirationDate.toDate())) {
        return null;
    }

    return nextDate;
};


export function RecurringTransactions({ contracts }: { contracts: Contract[] }) {

    const upcomingPayments = contracts.map(contract => ({
        ...contract,
        nextDueDate: getNextDueDate(contract)
    }))
    .filter(payment => payment.nextDueDate !== null)
    .sort((a, b) => a.nextDueDate!.getTime() - b.nextDueDate!.getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Próximos Vencimentos</CardTitle>
                <CardDescription>
                    Estas são as suas próximas contas recorrentes baseadas nos seus contratos.
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
                                       <Button size="sm" disabled>Pagar (Em breve)</Button>
                                   </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
