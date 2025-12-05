
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { AccessControlClient } from '@/components/settings/access-control-client';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccessControlPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{role?: string}>(userDocRef);

  const rolesQuery = useMemoFirebase(() => {
    if (userProfile?.role !== 'admin') return null;
    return collection(firestore, 'roles');
  }, [firestore, userProfile]);

  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesQuery);
  
  const isLoading = isProfileLoading || rolesLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <header>
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-5 w-96 mt-2" />
          </header>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground">Você não tem permissão para ver esta página.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AccessControlClient roles={roles ?? []} />
    </AppLayout>
  );
}

    