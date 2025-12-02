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

  const queries = useMemoFirebase(() => {
    if (!user) return null;
    return {
      incomesRef: collection(firestore, 'users', user.uid, 'incomes'),
      expensesRef: collection(firestore, 'users', user.uid, 'expenses'),
      budgetsRef: collection(firestore, 'users', user.uid, 'budgets'),
    };
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(
    queries ? query(queries.incomesRef, orderBy('date', 'desc'), limit(50)) : null
  );
  
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(
    queries ? query(queries.expensesRef, orderBy('date', 'desc'), limit(50)) : null
  );

  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(
    queries ? queries.budgetsRef : null
  );

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
