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

  // Global collections
  const globalIncomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const incomesRef = collection(firestore, 'incomes');
    return query(incomesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore]);

  const globalExpensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const expensesRef = collection(firestore, 'expenses');
    return query(expensesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore]);
  
  // User-specific (legacy) collections
  const userIncomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const incomesRef = collection(firestore, 'users', user.uid, 'incomes');
    return query(incomesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);

  const userExpensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const expensesRef = collection(firestore, 'users', user.uid, 'expenses');
    return query(expensesRef, orderBy('date', 'desc'), limit(50));
  }, [firestore, user]);


  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'budgets');
  }, [firestore]);

  const { data: globalIncomesData, isLoading: globalIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(globalIncomesQuery);
  const { data: globalExpensesData, isLoading: globalExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(globalExpensesQuery);
  const { data: userIncomesData, isLoading: userIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(userIncomesQuery);
  const { data: userExpensesData, isLoading: userExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(userExpensesQuery);
  
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);

  const transactions = useMemo(() => {
    const allIncomes = [...(globalIncomesData ?? []), ...(userIncomesData ?? [])];
    const allExpenses = [...(globalExpensesData ?? []), ...(userExpensesData ?? [])];

    // Deduplicate transactions by ID
    const uniqueIds = new Set<string>();
    const combined: Transaction[] = [];

    [
        ...allIncomes.map(item => ({ ...item, type: 'income' as const })),
        ...allExpenses.map(item => ({ ...item, type: 'expense' as const })),
    ].forEach(transaction => {
        if (!uniqueIds.has(transaction.id)) {
            uniqueIds.add(transaction.id);
            combined.push(transaction);
        }
    });

    return combined.sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [globalIncomesData, globalExpensesData, userIncomesData, userExpensesData]);

  const isLoading = globalIncomesLoading || globalExpensesLoading || userIncomesLoading || userExpensesLoading || budgetsLoading;

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
