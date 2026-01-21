'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { UserManagementClient } from '@/components/user-management/user-management-client';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserManagement, UserProfile } from '@/lib/types';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  const usersQuery = useMemoFirebase(() => {
    // Allow if admin OR has specific permission
    if (!isAdmin && !userProfile?.permissions?.userManagement?.view) return null;
    return query(collection(firestore, 'users'), orderBy('createdAt', 'desc'));
  }, [firestore, userProfile, isAdmin]);

  const { data: users, isLoading: usersLoading } = useCollection<UserManagement>(usersQuery);

  const isLoading = isProfileLoading || usersLoading;

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
                                    <Skeleton className="h-5 w-1/fiv" />
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
    );
  }

  // If user doesn't have permission to view, show an empty state.
  if (!isAdmin && !userProfile?.permissions?.userManagement?.view) {
     return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
            <p className="text-muted-foreground">Você não tem permissão para ver esta página.</p>
        </div>
      </AppLayout>
    );
  }

  // User is confirmed to have permission, show the main component.
  return (
    <AppLayout>
      <UserManagementClient data={users ?? []} />
    </AppLayout>
  );
}
