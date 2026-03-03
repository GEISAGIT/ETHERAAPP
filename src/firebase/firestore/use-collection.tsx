'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  collectionGroup,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore, useUser, useAuth } from '@/firebase/provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const auth = useAuth();

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
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

        // SILENT RETURN se o usuário não estiver carregado ou o token ainda não estiver sincronizado.
        // Isso evita que a tela de erro fatal apareça durante condições de corrida no carregamento.
        if (!auth || !auth.currentUser) {
          setIsLoading(false);
          return;
        }

        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        try {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });

          // Se por algum motivo o construtor do erro ainda não ver o usuário, ignoramos para segurança.
          if (!contextualError.request.auth) {
            setIsLoading(false);
            return;
          }

          setError(contextualError);
          setData(null);
          setIsLoading(false);
          errorEmitter.emit('permission-error', contextualError);
        } catch (e) {
          // Fallback silencioso para erros na construção da mensagem
          setIsLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, auth]);

  return { data, isLoading, error };
}


export function useCollectionGroup<T = any>(
  collectionId: string
): UseCollectionResult<T> {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const queryRef = useMemo(() => {
    if (!firestore || !user) return null;
    return collectionGroup(firestore, collectionId);
  }, [firestore, user, collectionId]);
  
  const { data, isLoading, error } = useCollection<T>(queryRef);

  return { data, isLoading, error };
}
