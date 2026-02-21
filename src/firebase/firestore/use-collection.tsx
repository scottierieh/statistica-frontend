'use client';
import { useEffect, useState, useRef } from 'react';
import {
  onSnapshot,
  Query,
  DocumentData,
  QuerySnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  // query의 경로를 기준으로 안정적인 의존성 생성
  const queryPath = query ? (query as any)._query?.path?.toString() || '' : '';

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const auth = getAuth();

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
      },
      async (serverError: FirestoreError) => {
        if (!auth.currentUser) {
          return;
        }

        const permissionError = new FirestorePermissionError({
          path: (query as any)._query?.path?.toString() || 'unknown',
          operation: 'list',
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
        setError(serverError);
        setLoading(false);
      }
    );

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        unsubscribe();
      }
    });

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryPath]);

  return { data, loading, error };
}