
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { AddressesClient } from '@/components/settings/addresses-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { StorageLocation, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function StorageLocationsPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const isAdmin = userProfile.role === 'admin';
    const canView = userProfile.permissions?.addresses?.view;

    if (!isAdmin && !canView) return null;

    // Em produção, restringimos a visualização conforme permissão
    return query(collection(firestore, 'storageLocations'));
  }, [firestore, user, userProfile]);

  const { data: locations, isLoading: locationsLoading } = useCollection<StorageLocation>(locationsQuery);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.addresses?.view;

  if (profileLoading || locationsLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar os Locais de Armazenamento.</p>
      </div>
    );
  }

  return <AddressesClient data={locations ?? []} userProfile={userProfile} />;
}

export default function StorageLocationsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <StorageLocationsPageContent />
      </Suspense>
    </AppLayout>
  );
}
