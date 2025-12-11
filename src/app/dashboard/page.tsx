'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Budget, Transaction } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Global collections for new data
  const globalIncomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'incomes'), orderBy('date', 'desc'), limit(50));
  }, [firestore]);

  const globalExpensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'), limit(50));
  }, [firestore]);

  // Legacy user-specific collections for old data
  const legacyIncomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/incomes`), orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);

  const legacyExpensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);
  
  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'budgets');
  }, [firestore]);

  const { data: globalIncomesData, isLoading: globalIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(globalIncomesQuery);
  const { data: globalExpensesData, isLoading: globalExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(globalExpensesQuery);
  const { data: legacyIncomesData, isLoading: legacyIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(legacyIncomesQuery);
  const { data: legacyExpensesData, isLoading: legacyExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(legacyExpensesQuery);
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactions = useMemo(() => {
    const allIncomes = [
      ...(globalIncomesData?.map(item => ({ ...item, type: 'income' as const })) ?? []),
      ...(legacyIncomesData?.map(item => ({ ...item, type: 'income' as const })) ?? [])
    ];
    const allExpenses = [
      ...(globalExpensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? []),
      ...(legacyExpensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? [])
    ];
    
    // Remove duplicates by ID, preferring global data over legacy if IDs match
    const combinedMap = new Map<string, Transaction>();
    [...allIncomes, ...allExpenses].forEach(t => combinedMap.set(t.id, t));

    const combined = Array.from(combinedMap.values());
    
    return combined.sort((a, b) => {
        const dateA = a.date?.toMillis() ?? 0;
        const dateB = b.date?.toMillis() ?? 0;
        return dateB - dateA;
    });
  }, [globalIncomesData, globalExpensesData, legacyIncomesData, legacyExpensesData]);

  const isLoading = globalIncomesLoading || globalExpensesLoading || legacyIncomesLoading || legacyExpensesLoading || budgetsLoading;

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
