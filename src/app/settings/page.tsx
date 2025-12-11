'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { SettingsClient } from '@/components/settings/settings-client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategory } from '@/lib/types';

export default function SettingsPage() {
  const firestore = useFirestore();

  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'incomeCategories'));
  }, [firestore]);

  const expenseCategoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'expenseCategories'));
  }, [firestore]);

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
