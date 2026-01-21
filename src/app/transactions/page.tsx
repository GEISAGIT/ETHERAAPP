'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import type { Transaction, Contract, ExpenseTransaction, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { collection, query, doc, where } from 'firebase/firestore';


export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const canViewAll = userProfile.role === 'admin' || userProfile.permissions?.transactions?.view;
    return canViewAll
      ? query(collection(firestore, 'incomes'))
      : query(collection(firestore, 'incomes'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const canViewAll = userProfile.role === 'admin' || userProfile.permissions?.transactions?.view;
    return canViewAll
      ? query(collection(firestore, 'expenses'))
      : query(collection(firestore, 'expenses'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const canViewAll = userProfile.role === 'admin' || userProfile.permissions?.transactions?.view;
    return canViewAll
      ? query(collection(firestore, 'contracts'))
      : query(collection(firestore, 'contracts'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<ExpenseTransaction>(expensesQuery);
  const { data: contractsData, isLoading: contractsLoading } = useCollection<Contract>(contractsQuery);
  
  const data = useMemo(() => {
    if (!user) return [];
    
    // Combine all incomes and expenses from the collection queries
    const allIncomes = (incomesData ?? []).map(item => ({ ...item, type: 'income' as const }));
    const allExpenses = (expensesData ?? []).map(item => ({ ...item, type: 'expense' as const }));

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading || contractsLoading || profileLoading;

  return (
    <AppLayout>
      <TransactionsClient 
        data={data ?? []} 
        contracts={contractsData ?? []}
        expenses={expensesData ?? []}
        isLoading={isLoading} 
      />
    </AppLayout>
  );
}
