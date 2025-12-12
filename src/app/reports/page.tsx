'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'incomes'));
  }, [firestore]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenses'));
  }, [firestore]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  
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
