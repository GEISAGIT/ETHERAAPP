
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { ActivitiesClient } from '@/components/activities/activities-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Activity, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function ActivitiesPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.activities?.view;

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'));
  }, [firestore, user, canView]);

  const { data: activities, isLoading: activitiesLoading } = useCollection<Activity>(activitiesQuery);

  if (profileLoading || (canView && activitiesLoading)) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar a Gestão de Atividades.</p>
      </div>
    );
  }

  return (
    <ActivitiesClient 
      activities={activities ?? []} 
      userProfile={userProfile} 
    />
  );
}

export default function ActivitiesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <ActivitiesPageContent />
      </Suspense>
    </AppLayout>
  );
}
