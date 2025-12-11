'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useFirestore, useMemoFirebase, useUser, useCollectionGroup } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const { data: incomesData, isLoading: incomesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('incomes');
  const { data: expensesData, isLoading: expensesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('expenses');
  
  const data = useMemo(() => {
    const allIncomes = incomesData?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? [];

    const combined = [...allIncomes, ...allExpenses];

    return combined.sort((a, b) => {
        const dateA = a.date?.toMillis() ?? 0;
        const dateB = b.date?.toMillis() ?? 0;
        return dateB - dateA;
    });
  }, [incomesData, expensesData]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
