'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ReportsClient } from '@/components/reports/reports-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Transaction } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { useMemo } from 'react';

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Global collections
  const globalIncomesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'incomes'), orderBy('date', 'desc'));
  }, [firestore]);

  const globalExpensesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenses'), orderBy('date', 'desc'));
  }, [firestore]);
  
  // User-specific (legacy) collections
  const userIncomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'incomes'), orderBy('date', 'desc'));
  }, [firestore, user]);

  const userExpensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'expenses'), orderBy('date', 'desc'));
  }, [firestore, user]);


  const { data: globalIncomes, isLoading: globalIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(globalIncomesQuery);
  const { data: globalExpenses, isLoading: globalExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(globalExpensesQuery);
  const { data: userIncomes, isLoading: userIncomesLoading } = useCollection<Omit<Transaction, 'type'>>(userIncomesQuery);
  const { data: userExpenses, isLoading: userExpensesLoading } = useCollection<Omit<Transaction, 'type'>>(userExpensesQuery);

  const data = useMemo(() => {
    const allIncomes = [...(globalIncomes ?? []), ...(userIncomes ?? [])];
    const allExpenses = [...(globalExpenses ?? []), ...(userExpenses ?? [])];
    
    // Deduplicate transactions by ID to prevent showing the same item twice
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

    return combined;
  }, [globalIncomes, globalExpenses, userIncomes, userExpenses]);

  const isLoading = globalIncomesLoading || globalExpensesLoading || userIncomesLoading || userExpensesLoading;

  return (
    <AppLayout>
      <ReportsClient data={data} isLoading={isLoading}/>
    </AppLayout>
  );
}
