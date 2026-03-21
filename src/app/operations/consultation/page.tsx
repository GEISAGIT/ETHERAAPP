'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { ConsultationClient } from '@/components/operations/consultation-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where, Timestamp, orderBy } from 'firebase/firestore';
import type { Appointment, Consultation, UserProfile } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';

function ConsultationPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';
  const canView = isAdmin || userProfile?.permissions?.consultations?.view;

  // Busca agendamentos de hoje
  const todayAppointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    
    return query(
      collection(firestore, 'appointments'),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime', 'asc')
    );
  }, [firestore, user, canView]);

  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(todayAppointmentsQuery);

  // Busca histórico de consultas recentes
  const consultationsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !canView) return null;
    return query(
      collection(firestore, 'consultations'),
      orderBy('date', 'desc')
    );
  }, [firestore, user, canView]);

  const { data: consultations, isLoading: consultationsLoading } = useCollection<Consultation>(consultationsQuery);

  if (profileLoading || (canView && (appointmentsLoading || consultationsLoading))) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground mt-2">Você não tem permissão para visualizar o Módulo de Atendimento.</p>
      </div>
    );
  }

  return (
    <ConsultationClient 
      appointments={appointments ?? []} 
      consultations={consultations ?? []}
      userProfile={userProfile} 
    />
  );
}

export default function ConsultationPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <ConsultationPageContent />
      </Suspense>
    </AppLayout>
  );
}
