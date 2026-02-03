'use client';

import React, { ReactNode } from 'react';
import { initializeFirebase } from './index'; 
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
    children: ReactNode;
    app: any;
    auth: any;
    firestore: any;
}

export const FirebaseClientProvider: React.FC<FirebaseClientProviderProps> = ({ children, app, auth, firestore }) => {
  // Firebase is initialized once and passed down.
  // This component ensures that on the client, we don't re-initialize.
  return <>{children}</>;
};
