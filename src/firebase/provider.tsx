'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { FirebaseClientProvider } from './client-provider';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode; app: FirebaseApp; auth: Auth; firestore: Firestore }> = ({ children, app, auth, firestore }) => {
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore }}>
      <FirebaseClientProvider app={app} auth={auth} firestore={firestore}>
        {children}
      </FirebaseClientProvider>
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) {
        throw new Error('useFirebase must be used within a FirebaseProvider');
    }
    return context;
};

export const useFirebaseApp = () => {
    const context = useFirebase();
    return context.app;
};

export const useFirestore = () => {
    const context = useFirebase();
    return context.firestore;
};

export const useAuth = () => {
    const context = useFirebase();
    return context.auth;
};
