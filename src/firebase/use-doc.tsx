'use client';

import { useEffect, useState } from 'react';
import {
  onSnapshot,
  DocumentReference,
  DocumentData,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const auth = getAuth();

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<T>) => {
        setData(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null);
        setLoading(false);
      },
      async (serverError: FirestoreError) => {
        // 사용자가 로그아웃한 상태에서 발생하는 권한 에러는 무시함
        if (!auth.currentUser) {
          return;
        }

        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
        setError(serverError);
        setLoading(false);
      }
    );

    // 인증 상태 변경 감지하여 로그아웃 시 리스너 종료
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        unsubscribe();
      }
    });

    return () => {
      unsubscribe();
      authUnsubscribe();
    };
  }, [docRef]);

  return { data, loading, error };
}