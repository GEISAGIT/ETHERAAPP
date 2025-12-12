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
       // User exists in Auth, but not in Firestore. This can happen during sign up.
       // The login form will create the user document. For now, log them out to be safe.
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
