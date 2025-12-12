'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ExpenseSettingsClient } from '@/components/settings/expense-settings-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { ExpenseCategoryGroup } from '@/lib/types';
import { useEffect } from 'react';
import { defaultExpenseCategoryGroups } from '@/lib/data';
import { addDocumentNonBlocking } from '@/firebase';

export default function ExpenseSettingsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const expenseCategoryGroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenseCategoryGroups'));
  }, [firestore, user]);

  const { data: expenseCategoryGroups, isLoading: expenseLoading } = useCollection<ExpenseCategoryGroup>(expenseCategoryGroupsQuery);

  useEffect(() => {
    if (!expenseLoading && expenseCategoryGroups?.length === 0 && firestore && user) {
        console.log("Seeding expense category groups...");
        const expenseCollection = collection(firestore, 'expenseCategoryGroups');
        defaultExpenseCategoryGroups.forEach(group => {
            addDocumentNonBlocking(expenseCollection, group);
        });
    }
  }, [expenseLoading, expenseCategoryGroups, firestore, user]);

  const isLoading = isUserLoading || expenseLoading;

  return (
    <AppLayout>
      <ExpenseSettingsClient 
        expenseCategoryGroups={expenseCategoryGroups ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
