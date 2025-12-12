'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollectionGroup, useUser } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const { user } = useUser();

  const { data: incomesData, isLoading: incomesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('incomes');
  const { data: expensesData, isLoading: expensesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('expenses');
  
  const data = useMemo(() => {
    if (!user) return [];
    
    // Combine all incomes and expenses from the collection group queries
    const allIncomes = (incomesData ?? []).map(item => ({ ...item, type: 'income' as const }));
    const allExpenses = (expensesData ?? []).map(item => ({ ...item, type: 'expense' as const }));

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
