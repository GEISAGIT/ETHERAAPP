'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import type { Budget, Transaction, UserProfile, Contract, ExpenseTransaction } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'budgets'), where('userId', '==', user.uid));
  }, [firestore, user]);
  
  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    return userProfile.role === 'admin'
      ? query(collection(firestore, 'incomes'))
      : query(collection(firestore, 'incomes'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    return userProfile.role === 'admin'
      ? query(collection(firestore, 'expenses'))
      : query(collection(firestore, 'expenses'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'contracts'), where('userId', '==', user.uid));
  }, [firestore, user]);


  const { data: incomes, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expenses, isLoading: expensesLoading } = useCollection<ExpenseTransaction>(expensesQuery);
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsQuery);
  const { data: contracts, isLoading: contractsLoading } = useCollection<Contract>(contractsQuery);

  const transactions = useMemo(() => {
    const allIncomes = incomes?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expenses?.map(item => ({ ...item, type: 'expense' as const })) ?? [];
    
    const combined = [...allIncomes, ...allExpenses];
    
    return combined.sort((a, b) => {
        const dateA = a.date?.toMillis() ?? 0;
        const dateB = b.date?.toMillis() ?? 0;
        return dateB - dateA;
    });
  }, [incomes, expenses]);

  const isLoading = incomesLoading || expensesLoading || budgetsLoading || profileLoading || contractsLoading;

  return (
    <AppLayout>
      <DashboardClient 
        transactions={transactions} 
        budgets={budgets ?? []} 
        contracts={contracts ?? []}
        expenses={expenses ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
