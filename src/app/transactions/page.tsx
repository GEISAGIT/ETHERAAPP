'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useFirestore, useMemoFirebase, useUser, useCollectionGroup } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'incomes');
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, 'expenses');
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  
  const data = useMemo(() => {
    if (!user) return [];
    const allIncomes = incomesData?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? [];

    const combined = [...allIncomes, ...allExpenses];

    // The sorting will now be handled in the client component
    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
