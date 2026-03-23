'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import type { Transaction, UserProfile } from '@/lib/types';
import { useMemo } from 'react';
import { collection, query, doc, where } from 'firebase/firestore';

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const canViewAll = userProfile.role === 'admin' || userProfile.permissions?.reports?.view;
    return canViewAll
      ? query(collection(firestore, 'incomes'))
      : query(collection(firestore, 'incomes'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const canViewAll = userProfile.role === 'admin' || userProfile.permissions?.reports?.view;
    return canViewAll
      ? query(collection(firestore, 'expenses'))
      : query(collection(firestore, 'expenses'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  
  const data = useMemo(() => {
    if (!user) return [];
    const allIncomes = incomesData?.map(item => ({ ...item, type: 'income' as const })) ?? [];
    const allExpenses = expensesData?.map(item => ({ ...item, type: 'expense' as const })) ?? [];

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading || profileLoading;

  return (
    <AppLayout>
      <ReportsClient data={data} isLoading={isLoading}/>
    </AppLayout>
  );
}
