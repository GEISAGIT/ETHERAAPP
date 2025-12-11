'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Budget, Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const incomesRef = collection(firestore, 'incomes');
    return query(incomesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const expensesRef = collection(firestore, 'expenses');
    return query(expensesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore]);
  
  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'budgets');
  }, [firestore]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactions = useMemo(() => {
    const combined: Transaction[] = [
        ...(incomesData?.map(item => ({ ...item, type: 'income' as const })) ?? []),
        ...(expensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? []),
    ];
    // This sort might be redundant if Firestore query is reliable, but good for safety
    return combined.sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [incomesData, expensesData]);

  const isLoading = incomesLoading || expensesLoading || budgetsLoading;

  return (
    <AppLayout>
      <DashboardClient 
        transactions={transactions} 
        budgets={budgets ?? []} 
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
