'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TransactionsClient } from '@/components/transactions/transactions-client';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { Transaction, Contract } from '@/lib/types';
import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';


export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const incomesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomes'));
  }, [firestore, user]);

  const expensesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenses'));
  }, [firestore, user]);

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'contracts'));
  }, [firestore, user]);

  const { data: incomesData, isLoading: incomesLoading } = useCollection<Omit<Transaction, 'type'>>(incomesQuery);
  const { data: expensesData, isLoading: expensesLoading } = useCollection<Omit<Transaction, 'type'>>(expensesQuery);
  const { data: contractsData, isLoading: contractsLoading } = useCollection<Contract>(contractsQuery);
  
  const data = useMemo(() => {
    if (!user) return [];
    
    // Combine all incomes and expenses from the collection queries
    const allIncomes = (incomesData ?? []).map(item => ({ ...item, type: 'income' as const }));
    const allExpenses = (expensesData ?? []).map(item => ({ ...item, type: 'expense' as const }));

    const combined = [...allIncomes, ...allExpenses];

    return combined;
  }, [incomesData, expensesData, user]);

  const isLoading = incomesLoading || expensesLoading || contractsLoading;

  return (
    <AppLayout>
      <TransactionsClient 
        data={data ?? []} 
        contracts={contractsData ?? []}
        isLoading={isLoading} 
      />
    </AppLayout>
  );
}
