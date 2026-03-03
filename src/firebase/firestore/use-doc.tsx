
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '@/firebase/provider';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const auth = useAuth();

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Apenas processamos erros de permissão negada para o overlay de erro customizado.
        if (err.code !== 'permission-denied') {
          setIsLoading(false);
          setError(err);
          return;
        }

        // Apenas reportamos erro de permissão se realmente houver um usuário logado.
        if (!auth || !auth.currentUser) {
          setIsLoading(false);
          return;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        // Se o erro ainda indicar "auth: null", ignoramos por ser transiente.
        if (!contextualError.request.auth) {
          setIsLoading(false);
          return;
        }

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, auth]);

  return { data, isLoading, error };
}
