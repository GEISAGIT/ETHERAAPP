
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { ActivitiesClient } from '@/components/activities/activities-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import type { Activity, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function ActivitiesPageContent() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: activities, isLoading: activitiesLoading } = useCollection<Activity>(activitiesQuery);

  if (profileLoading || activitiesLoading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
