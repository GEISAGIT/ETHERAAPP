'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { SettingsClient } from '@/components/settings/settings-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategoryGroup } from '@/lib/types';

export default function SettingsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return query(collection(firestore, 'incomeCategories'));
  }, [firestore, user]);

  const expenseCategoryGroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenseCategoryGroups'));
  }, [firestore, user]);

  const { data: incomeCategories, isLoading: incomeLoading } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  const { data: expenseCategoryGroups, isLoading: expenseLoading } = useCollection<ExpenseCategoryGroup>(expenseCategoryGroupsQuery);
  
  const isLoading = isUserLoading || incomeLoading || expenseLoading;

  return (
    <AppLayout>
      <SettingsClient 
        incomeCategories={incomeCategories ?? []}
        expenseCategoryGroups={expenseCategoryGroups ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
