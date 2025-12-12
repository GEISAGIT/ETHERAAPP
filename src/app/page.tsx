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
    // While auth or profile data is loading, just wait.
    if (isUserLoading || isProfileLoading) {
      return;
    }

    // If auth is done and there's no user, redirect to login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // If auth is done, user object exists, and we have a user profile from Firestore.
    if (userProfile) {
      if (userProfile.status === 'active') {
        router.replace('/dashboard');
      } else {
        // User is pending or rejected, log them out and show the relevant message.
        const message = userProfile.status === 'pending'
          ? 'Sua conta está pendente de aprovação.'
          : 'Sua conta foi rejeitada.';
        signOut(auth).then(() => {
            router.replace(`/login?message=${encodeURIComponent(message)}`);
        });
      }
    } else {
       // This case is a waiting state. Auth is done but Firestore read is pending or the doc doesn't exist yet.
       // The loading screen will continue to show. If the doc never appears, they stay here,
       // but the login form logic should handle creating the document, preventing an infinite loop.
    }

  }, [user, userProfile, isUserLoading, isProfileLoading, router, auth]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
