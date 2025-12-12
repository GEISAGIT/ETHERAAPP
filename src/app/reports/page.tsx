'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { useCollectionGroup, useUser } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function ReportsPage() {
  const { user } = useUser();

  const { data: incomesData, isLoading: incomesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('incomes');
  const { data: expensesData, isLoading: expensesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('expenses');
  
  const data = useMemo(() => {
    if (!user) return [];
    const allIncomes = incomesData?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? [];

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <ReportsClient data={data} isLoading={isLoading}/>
    </AppLayout>
  );
}
