// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVC6S1BCCM6Nur7NCHzdtHYCvuTwdocPQ",
  authDomain: "research-review-v2.firebaseapp.com",
  projectId: "research-review-v2",
  storageBucket: "research-review-v2.firebasestorage.app",
  messagingSenderId: "152496385005",
  appId: "1:152496385005:web:90481bbc9736e22bc595e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export the services our app needs
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// --- THIS IS THE NEW PART ---
// Connect to local emulators IF in development mode
// We check `import.meta.env.DEV` which is a variable Vite provides for us.
if (import.meta.env.DEV) {
  try {
    // Note: The ports here must match the ones you chose in `firebase init emulators`
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    
    console.log("SUCCESS: Connected to local Firebase Emulators!");
  } catch (e) {
    console.error("Error connecting to Firebase emulators:", e);
  }
}
// -----------------------------

export default app;
