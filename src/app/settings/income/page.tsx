'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { IncomeSettingsClient } from '@/components/settings/income-settings-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { IncomeCategory } from '@/lib/types';
import { useEffect } from 'react';
import { defaultIncomeCategories } from '@/lib/data';
import { addDocumentNonBlocking } from '@/firebase';

export default function IncomeSettingsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomeCategories'));
  }, [firestore, user]);

  const { data: incomeCategories, isLoading: incomeLoading } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  
   useEffect(() => {
    if (!incomeLoading && incomeCategories?.length === 0 && firestore) {
      console.log("Seeding income categories...");
      const incomeCategoriesCollection = collection(firestore, 'incomeCategories');
      defaultIncomeCategories.forEach(name => {
        addDocumentNonBlocking(incomeCategoriesCollection, { name });
      });
    }
  }, [incomeLoading, incomeCategories, firestore]);

  const isLoading = isUserLoading || incomeLoading;

  return (
    <AppLayout>
      <IncomeSettingsClient 
        incomeCategories={incomeCategories ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}
