'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';

// ─── Internal auth hook (avoids circular imports) ────────
function useCurrentUser() {
  const { auth } = initializeFirebase();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, [auth]);

  return user;
}

// ─── Types ───────────────────────────────────────────────

export interface PipelineStepData {
  type: string;
  category: 'collect' | 'clean' | 'transform' | 'feature' | 'export';
  label: string;
  description: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface PipelineData {
  id: string;
  name: string;
  description: string;
  steps: PipelineStepData[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: string | null;
  runCount: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  steps?: PipelineStepData[];
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  steps?: PipelineStepData[];
  status?: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: string | null;
  runCount?: number;
}

// ─── Collection name ─────────────────────────────────────

const COLLECTION = 'pipelines';

// ─── Hook: List user's pipelines ─────────────────────────

export function usePipelines() {
  const { firestore, auth } = initializeFirebase();
  const user = useCurrentUser();

  const q = useMemo(() => {
    if (!user?.uid) return null;
    return query(
      collection(firestore, COLLECTION),
      where('userId', '==', user.uid)
    );
  }, [firestore, user?.uid]);

  const { data, loading, error } = useCollection<PipelineData>(q as any);

  return { pipelines: data, loading, error };
}

// ─── Hook: Single pipeline by ID ─────────────────────────

export function usePipeline(pipelineId: string | null) {
  const { firestore } = initializeFirebase();

  const ref = useMemo(() => {
    if (!pipelineId) return null;
    return doc(firestore, COLLECTION, pipelineId);
  }, [firestore, pipelineId]);

  const { data, loading, error } = useDoc<PipelineData>(ref as any);

  return { pipeline: data, loading, error };
}

// ─── Mutation functions ──────────────────────────────────

export function usePipelineMutations() {
  const { firestore, auth } = initializeFirebase();
  const user = useCurrentUser();

  const createPipeline = useCallback(async (input: CreatePipelineInput): Promise<string> => {
    if (!user?.uid) throw new Error('Not authenticated');

    const docRef = await addDoc(collection(firestore, COLLECTION), {
      name: input.name,
      description: input.description || '',
      steps: input.steps || [],
      status: 'idle',
      lastRun: null,
      runCount: 0,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }, [firestore, user?.uid]);

  const updatePipeline = useCallback(async (pipelineId: string, updates: UpdatePipelineInput): Promise<void> => {
    if (!user?.uid) throw new Error('Not authenticated');

    const ref = doc(firestore, COLLECTION, pipelineId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }, [firestore, user?.uid]);

  const deletePipeline = useCallback(async (pipelineId: string): Promise<void> => {
    if (!user?.uid) throw new Error('Not authenticated');

    const ref = doc(firestore, COLLECTION, pipelineId);
    await deleteDoc(ref);
  }, [firestore, user?.uid]);

  const duplicatePipeline = useCallback(async (pipeline: PipelineData): Promise<string> => {
    if (!user?.uid) throw new Error('Not authenticated');

    const docRef = await addDoc(collection(firestore, COLLECTION), {
      name: `${pipeline.name} (copy)`,
      description: pipeline.description,
      steps: JSON.parse(JSON.stringify(pipeline.steps)),
      status: 'idle',
      lastRun: null,
      runCount: 0,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }, [firestore, user?.uid]);

  const updatePipelineRunResult = useCallback(async (
    pipelineId: string,
    status: 'completed' | 'failed',
    lastRun: string,
  ): Promise<void> => {
    if (!user?.uid) throw new Error('Not authenticated');

    const ref = doc(firestore, COLLECTION, pipelineId);
    await updateDoc(ref, {
      status,
      lastRun,
      runCount: (await import('firebase/firestore')).increment(1),
      updatedAt: serverTimestamp(),
    });
  }, [firestore, user?.uid]);

  return {
    createPipeline,
    updatePipeline,
    deletePipeline,
    duplicatePipeline,
    updatePipelineRunResult,
  };
}