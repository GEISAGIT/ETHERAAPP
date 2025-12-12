'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import type { Transaction, UserProfile } from '@/lib/types';
import { collection, query, doc } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // Query for incomes collection
  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomes'));
  }, [firestore, user]);

  // Query for expenses collection
  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'));
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  
  const data = useMemo(() => {
    if (!user || !userProfile) return [];
    
    const isAdmin = userProfile.role === 'admin';

    // Admins see all transactions, users only see their own.
    const allIncomes = (incomesData ?? [])
      .filter(item => isAdmin || item.userId === user.uid)
      .map(item => ({ ...item, type: 'income' as const }));
      
    const allExpenses = (expensesData ?? [])
      .filter(item => isAdmin || item.userId === user.uid)
      .map(item => ({ ...item, type: 'expense' as const }));

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user, userProfile]);

  const isLoading = incomesLoading || expensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
