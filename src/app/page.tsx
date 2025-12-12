'use client';

import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getFirestore } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { signOut, getAuth } from 'firebase/auth';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = getFirestore();
  const auth = getAuth();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (isUserLoading || (user && isProfileLoading)) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }
    
    if (user && userProfile) {
       if (userProfile.status === 'active') {
        router.replace('/dashboard');
      } else {
         // This should now be handled by the login form,
         // but as a fallback, we keep a check here.
         // We avoid auto-signing out to prevent loops if there's a Firestore delay.
      }
    } else if (user && !userProfile && !isProfileLoading) {
        // User is authenticated but profile doesn't exist. This can happen right after signup.
        // The login form should create it. We wait here.
    }

  }, [user, userProfile, isUserLoading, isProfileLoading, router, auth]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
