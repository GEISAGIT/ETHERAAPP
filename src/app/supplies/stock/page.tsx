
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { StockClient } from '@/components/supplies/stock-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { StockItem, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function StockPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  // Consulta de Catálogo (Produtos Base)
  const catalogQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'itemCatalog'));
  }, [firestore, user]);

  const { data: catalogItems, isLoading: catalogLoading } = useCollection(catalogQuery);

  // Consulta de Estoque (Lotes Físicos)
  const stockQuery = useMemoFirebase(() => {
    if (!firestore || !user || !userProfile) return null;
    const isAdmin = userProfile.role === 'admin';
    const canView = userProfile.permissions?.suppliesStock?.view;

    if (!isAdmin && !canView) return null;

    return query(collection(firestore, 'stock'));
  }, [firestore, user, userProfile]);

  const { data: stockItems, isLoading: stockLoading } = useCollection<StockItem>(stockQuery);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.suppliesStock?.view;

  if (profileLoading || stockLoading || catalogLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar o Controle de Estoque.</p>
      </div>
    );
  }

  return (
    <StockClient 
      stockData={stockItems ?? []} 
      catalogData={catalogItems ?? []}
      userProfile={userProfile} 
    />
  );
}

export default function StockPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <StockPageContent />
      </Suspense>
    </AppLayout>
  );
}
