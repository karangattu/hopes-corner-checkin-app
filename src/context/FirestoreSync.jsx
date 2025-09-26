import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Real-time Firestore synchronization hook for multi-user admin access
 * Replaces localStorage-first pattern with Firestore-first real-time sync
 */
export const useFirestoreSync = (db, collectionName, setState, enabled = true) => {
  // Set up real-time listener for collection
  useEffect(() => {
    if (!enabled || !db) return;

    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(1000));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          docId: doc.id,
          // Ensure all records have required fields
          id: doc.data().id || doc.id,
          lastUpdated: doc.data().lastUpdated || new Date().toISOString()
        }));
        
        // Update local state with Firestore data
        setState(data);
        
        // Cache to localStorage for offline access
        try {
          localStorage.setItem(`hopes-corner-${collectionName}`, JSON.stringify(data));
        } catch (error) {
          console.warn(`Failed to cache ${collectionName} to localStorage:`, error);
        }
      },
      (error) => {
        console.error(`Real-time listener error for ${collectionName}:`, error);
        
        // Fallback to localStorage on error
        try {
          const cached = localStorage.getItem(`hopes-corner-${collectionName}`);
          if (cached) {
            setState(JSON.parse(cached));
          }
        } catch (fallbackError) {
          console.error(`Failed to load ${collectionName} from cache:`, fallbackError);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [db, collectionName, setState, enabled]);

  // Helper function to add document with real-time sync
  const addDocument = useCallback(async (data) => {
    if (!enabled || !db) throw new Error('Firestore not available');

    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      id: data.id || Date.now()
    };

    await setDoc(doc(db, collectionName, String(docData.id)), docData);
    return docData;
  }, [db, collectionName, enabled]);

  // Helper function to update document with real-time sync
  const updateDocument = useCallback(async (id, updates) => {
    if (!enabled || !db) throw new Error('Firestore not available');

    const updateData = {
      ...updates,
      lastUpdated: serverTimestamp()
    };

    await updateDoc(doc(db, collectionName, String(id)), updateData);
    return updateData;
  }, [db, collectionName, enabled]);

  // Helper function to delete document with real-time sync
  const deleteDocument = useCallback(async (id) => {
    if (!enabled || !db) throw new Error('Firestore not available');

    await deleteDoc(doc(db, collectionName, String(id)));
  }, [db, collectionName, enabled]);

  return {
    addDocument,
    updateDocument,
    deleteDocument
  };
};

/**
 * Utility function to merge arrays by newest timestamp, avoiding duplicates
 */
export const mergeByNewest = (local, remote) => {
  const combined = [...local, ...remote];
  const uniqueById = new Map();
  
  combined.forEach(item => {
    const existing = uniqueById.get(item.id);
    if (!existing || new Date(item.lastUpdated || item.createdAt) > new Date(existing.lastUpdated || existing.createdAt)) {
      uniqueById.set(item.id, item);
    }
  });
  
  return Array.from(uniqueById.values()).sort((a, b) => 
    new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );
};

/**
 * Online/Offline status hook for showing sync status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};