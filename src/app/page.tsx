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
    if (isUserLoading || isProfileLoading) {
      // Still loading, do nothing
      return;
    }

    if (!user) {
      // No user, send to login
      router.replace('/login');
      return;
    }
    
    // User is logged in, now check their profile from Firestore
    if (userProfile) {
      if (userProfile.status === 'active') {
        router.replace('/dashboard');
      } else {
        // User is pending or rejected, log them out and show a message
        signOut(auth).then(() => {
            const message = userProfile.status === 'pending'
              ? 'Sua conta está pendente de aprovação.'
              : 'Sua conta foi rejeitada.';
            router.replace(`/login?message=${encodeURIComponent(message)}`);
        });
      }
    } else {
       // This is a race condition case: Auth is faster than Firestore user doc creation on first signup.
       // The user doc is being created by the login form. To be safe, we log them out and ask them to
       // try again in a moment. This prevents them from getting stuck here.
       signOut(auth).then(() => {
            router.replace('/login?message=Cadastro em processamento. Tente novamente em alguns instantes.');
       });
    }

  }, [user, userProfile, isUserLoading, isProfileLoading, router, auth]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
