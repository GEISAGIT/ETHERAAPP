'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { BudgetsClient } from '@/components/budgets/budgets-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Budget } from '@/lib/types';


export default function BudgetsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const budgetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'budgets'));
  }, [firestore, user]);

  const { data, isLoading } = useCollection<Budget>(budgetsQuery);

  return (
    <AppLayout>
      <BudgetsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
