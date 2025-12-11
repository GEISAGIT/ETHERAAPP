'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Global collections for new data
  const globalIncomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomes'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const globalExpensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);

  // Legacy user-specific collections for old data
  const legacyIncomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/incomes`), orderBy('date', 'desc'));
  }, [firestore, user]);

  const legacyExpensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/expenses`), orderBy('date', 'desc'));
  }, [firestore, user]);

  const { data: globalIncomesData, isLoading: globalIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(globalIncomesQuery);
  const { data: globalExpensesData, isLoading: globalExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(globalExpensesQuery);
  const { data: legacyIncomesData, isLoading: legacyIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(legacyIncomesQuery);
  const { data: legacyExpensesData, isLoading: legacyExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(legacyExpensesQuery);
  
  const data = useMemo(() => {
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

  const isLoading = globalIncomesLoading || globalExpensesLoading || legacyIncomesLoading || legacyExpensesLoading;

  return (
    <AppLayout>
      <TransactionsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
