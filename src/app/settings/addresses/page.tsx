
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { AddressesClient } from '@/components/settings/addresses-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Address, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function AddressesPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const addressesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const isAdmin = userProfile.role === 'admin';
    const canView = userProfile.permissions?.addresses?.view;

    if (!isAdmin && !canView) return null;

    // Em produção, restringimos a visualização para evitar erro de permissão do Google
    // se o usuário não for administrador mestre.
    if (userProfile.role !== 'admin') {
        return query(collection(firestore, 'addresses'), where('userId', '==', user.uid));
    }

    return query(collection(firestore, 'addresses'));
  }, [firestore, user, userProfile]);

  const { data: addresses, isLoading: addressesLoading } = useCollection<Address>(addressesQuery);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.addresses?.view;

  if (profileLoading || addressesLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar o Cadastro de Endereços.</p>
      </div>
    );
  }

  return <AddressesClient data={addresses ?? []} userProfile={userProfile} />;
}

export default function AddressesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <AddressesPageContent />
      </Suspense>
    </AppLayout>
  );
}
