'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { BudgetsClient } from '@/components/budgets/budgets-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Budget } from '@/lib/types';


export default function BudgetsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const budgetsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'budgets'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data, isLoading } = useCollection<Budget>(budgetsQuery);

  return (
    <AppLayout>
      <BudgetsClient data={data ?? []} isLoading={isLoading} />
    </AppLayout>
  );
}
