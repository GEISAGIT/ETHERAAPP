
'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ContractsClient } from '@/components/settings/contracts-client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Contract } from '@/lib/types';


export default function ContractsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'contracts'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: contracts, isLoading: contractsLoading } = useCollection<Contract>(contractsQuery);

  const isLoading = isUserLoading || contractsLoading;

  return (
    <AppLayout>
      <ContractsClient 
        contracts={contracts ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}

    