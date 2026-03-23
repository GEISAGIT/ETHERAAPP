'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { CalendarClient } from '@/components/calendar/calendar-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Appointment, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function CalendarPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.calendar?.view;

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return query(collection(firestore, 'appointments'));
  }, [firestore, user, canView]);

  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(appointmentsQuery);

  if (profileLoading || (canView && appointmentsLoading)) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar a Agenda.</p>
      </div>
    );
  }

  return (
    <CalendarClient 
      appointments={appointments ?? []} 
      userProfile={userProfile} 
    />
  );
}

export default function CalendarPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <CalendarPageContent />
      </Suspense>
    </AppLayout>
  );
}
