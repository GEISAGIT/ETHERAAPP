'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useCollection, useFirestore, useMemoFirebase, useUser, useCollectionGroup } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Budget, Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'budgets');
  }, [firestore, user]);

  const { data: incomes, isLoading: incomesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('incomes');
  const { data: expenses, isLoading: expensesLoading } = useCollectionGroup<Omit<Transaction, 'type'>>('expenses');
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactions = useMemo(() => {
    const allIncomes = incomes?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expenses?.map(item => ({ ...item, type: 'expense' as const })) ?? [];
    
    const combined = [...allIncomes, ...allExpenses];
    
    return combined.sort((a, b) => {
        const dateA = a.date?.toMillis() ?? 0;
        const dateB = b.date?.toMillis() ?? 0;
        return dateB - dateA;
    }).slice(0, 50); // Apply limit after sorting
  }, [incomes, expenses]);

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
