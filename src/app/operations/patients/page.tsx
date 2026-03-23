'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { PatientsClient } from '@/components/patients/patients-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Patient, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function PatientsPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.patients?.view;

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return query(collection(firestore, 'patients'), orderBy('fullName', 'asc'));
  }, [firestore, user, canView]);

  const { data: patients, isLoading: patientsLoading } = useCollection<Patient>(patientsQuery);

  if (profileLoading || (canView && patientsLoading)) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar o Cadastro de Pacientes.</p>
      </div>
    );
  }

  return (
    <PatientsClient 
      patients={patients ?? []} 
      userProfile={userProfile} 
    />
  );
}

export default function PatientsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <PatientsPageContent />
      </Suspense>
    </AppLayout>
  );
}
