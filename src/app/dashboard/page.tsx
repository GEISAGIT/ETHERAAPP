'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Budget, Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const incomesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const incomesRef = collection(firestore, 'users', user.uid, 'incomes');
    return query(incomesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
    return query(expensesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);

  const budgetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'budgets');
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);

  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactions = useMemo(() => {
    if (!incomesData || !expensesData) return [];
    const combined: Transaction[] = [
      ...incomesData.map(item => ({ ...item, type: 'income' as const })),
      ...expensesData.map(item => ({ ...item, type: 'expense' as const })),
    ];
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
