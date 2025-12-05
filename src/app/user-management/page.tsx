
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { UserManagementClient } from '@/components/user-management/user-management-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserManagement } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserManagementPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{role?: string}>(userDocRef);

  const usersQuery = useMemoFirebase(() => {
    // Only fetch users if the current user is an admin
    if (userProfile?.role !== 'admin') return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile]);

  const { data: users, isLoading: usersLoading } = useCollection<UserManagement>(usersQuery);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user) {
        router.replace('/login');
      } else if (userProfile?.role !== 'admin') {
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);
  
  const isLoading = isUserLoading || isProfileLoading || (userProfile?.role === 'admin' && usersLoading);


  if (isLoading) {
    return (
       <AppLayout>
          <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-80" />
                <Skeleton className="h-5 w-96 mt-2" />
            </header>
             <div className="space-y-4">
                <div className="rounded-md border">
                    <div className="w-full">
                        <div className="border-b">
                            <div className="flex h-12 items-center px-4">
                                <Skeleton className="h-5 w-1/5" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                            </div>
                        </div>
                        <div>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex h-14 items-center px-4 border-b">
                                    <Skeleton className="h-5 w-1/5" />
                                    <Skeleton className="h-5 w-2/5 ml-4" />
                                    <Skeleton className="h-5 w-1/5 ml-4" />
                                    <Skeleton className="h-5 w-1/5 ml-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </div>
       </AppLayout>
    )
  }

  // If the user is not an admin, they will be redirected, but we can show a message in the meantime.
  if (userProfile?.role !== 'admin') {
     return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
            <p className="text-muted-foreground">Acesso negado. Redirecionando...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <UserManagementClient data={users ?? []} />
    </AppLayout>
  );
}
