'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const incomesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'incomes'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: incomes, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(
    incomesQuery
  );

  const { data: expenses, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(
    expensesQuery
  );

  const data = useMemo(() => {
    if (!incomes || !expenses) return [];
    const combined: Transaction[] = [
      ...incomes.map(item => ({ ...item, type: 'income' as const })),
      ...expenses.map(item => ({ ...item, type: 'expense' as const })),
    ];
    return combined;
  }, [incomes, expenses]);

  const isLoading = incomesLoading || expensesLoading;


  return (
    <AppLayout>
      <ReportsClient data={data} isLoading={isLoading}/>
    </AppLayout>
  );
}
