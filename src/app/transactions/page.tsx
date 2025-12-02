'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const incomesRef = collection(firestore, 'users', user.uid, 'incomes');
    const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
    // It's not straightforward to query two collections at once client-side.
    // We'll fetch them separately.
    return { incomesRef, expensesRef };
  }, [firestore, user]);

  const { data: incomes, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(
    transactionsQuery ? query(transactionsQuery.incomesRef, orderBy('date', 'desc')) : null
  );

  const { data: expenses, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(
    transactionsQuery ? query(transactionsQuery.expensesRef, orderBy('date', 'desc')) : null
  );

  const data = useMemo(() => {
    if (!incomes || !expenses) return [];
    const combined: Transaction[] = [
      ...incomes.map(item => ({ ...item, type: 'income' as const })),
      ...expenses.map(item => ({ ...item, type: 'expense' as const })),
    ];
    return combined.sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [incomes, expenses]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
