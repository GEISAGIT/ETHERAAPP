
'use client';
import { AppLayout } from '@/components/layout/app-layout';
import { ContractsClient } from '@/components/settings/contracts-client';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Contract, UserProfile } from '@/lib/types';


export default function ContractsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const contractsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    return userProfile.role === 'admin'
      ? query(collection(firestore, 'contracts'))
      : query(collection(firestore, 'contracts'), where('userId', '==', user.uid));
  }, [firestore, user, userProfile]);

  const { data: contracts, isLoading: contractsLoading } = useCollection<Contract>(contractsQuery);

  const isLoading = isUserLoading || contractsLoading || profileLoading;

  return (
    <AppLayout>
      <ContractsClient 
        contracts={contracts ?? []}
        isLoading={isLoading}
      />
    </AppLayout>
  );
}

    
