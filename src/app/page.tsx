'use client';

import { useUser, useDoc, useMemoFirebase, useAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // Show loading spinner while auth state or profile is being fetched.
    if (isUserLoading || (user && isProfileLoading)) {
      return;
    }

    // If auth is done and there's no user, redirect to login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // If user and profile are loaded, decide where to go.
    if (user && userProfile) {
       if (userProfile.status === 'active') {
        router.replace('/home');
      } else {
         // This is now handled by the login form, which shows a toast and signs the user out.
      }
    } else if (user && !userProfile && !isProfileLoading) {
        // Wait for profile document creation.
    }

  }, [user, userProfile, isUserLoading, isProfileLoading, router, auth]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
