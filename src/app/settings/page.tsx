'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { SettingsClient } from '@/components/settings/settings-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategory } from '@/lib/types';
import { useMemo } from 'react';

export default function SettingsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'incomeCategories'));
  }, [firestore, user]);

  const expenseCategoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'expenseCategories'));
  }, [firestore, user]);

  const { data: incomeCategories, isLoading: incomeLoading } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  const { data: expenseCategories, isLoading: expenseLoading } = useCollection<ExpenseCategory>(expenseCategoriesQuery);
  
  const isLoading = incomeLoading || expenseLoading;

  return (
    <AppLayout>
      <SettingsClient 
        incomeCategories={incomeCategories ?? []}
        expenseCategories={expenseCategories ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
