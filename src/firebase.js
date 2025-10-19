import { initializeApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const REQUIRED_CONFIG_KEYS = ["apiKey", "authDomain", "projectId", "appId"];
const isTestEnv = import.meta.env.MODE === "test";
const missingConfigKeys = REQUIRED_CONFIG_KEYS.filter(
  (key) => !firebaseConfig[key],
);

if (missingConfigKeys.length && !isTestEnv) {
  throw new Error(
    `Firebase configuration is incomplete. Missing: ${missingConfigKeys.join(", ")}`,
  );
}

const hasValidConfig = missingConfigKeys.length === 0;

export const app = hasValidConfig ? initializeApp(firebaseConfig) : null;

export let analytics;
if (hasValidConfig && import.meta.env.PROD) {
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

export const auth = hasValidConfig ? getAuth(app) : null;

let dbInstance = null;
if (hasValidConfig) {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
  } catch {
    dbInstance = getFirestore(app);
  }
}
export const db = dbInstance;

if (
  hasValidConfig &&
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
) {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  } catch {
    // ignore emulator wiring errors in dev
  }
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  } catch {
    // ignore emulator wiring errors in dev
  }
}
