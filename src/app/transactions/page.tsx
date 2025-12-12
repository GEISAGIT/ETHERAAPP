'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Query for incomes collection
  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomes'));
  }, [firestore, user]);

  // Query for expenses collection
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'));
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  
  const data = useMemo(() => {
    if (!user) return [];
    
    // Combine all incomes and expenses without filtering by user
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
