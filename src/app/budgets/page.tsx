'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { BudgetsClient } from '@/components/budgets/budgets-client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Budget } from '@/lib/types';


export default function BudgetsPage() {
  const firestore = useFirestore();

  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'budgets'));
  }, [firestore]);

  const { data, isLoading } = useCollection<Budget>(budgetsQuery);

  return (
    <AppLayout>
      <BudgetsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
