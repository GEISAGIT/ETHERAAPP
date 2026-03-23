'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }
  
  // For App Hosting, this will be automatically configured.
  try {
    const app = initializeApp();
    return getSdks(app);
  } catch (e) {
    // This is expected to fail in a local dev environment if not on App Hosting.
    // We'll then fall back to the explicit config.
    if (process.env.NODE_ENV === "production") {
        console.warn("Firebase auto-init failed, falling back to config", e);
    }
  }

  // Fallback to local config, but only if the API key is present.
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    return getSdks(app);
  }

  // If we're here, we're likely in a local dev environment without a .env.local file.
  // We can't initialize Firebase, so we return nulls to avoid a crash.
  console.error(
    'Firebase API Key is missing. Please create a .env.local file with your Firebase project configuration.'
  );

  return {
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
  };
}


export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
