import { createContext, useContext, useEffect, useState } from "react";
import { 
  auth, 
  db, 
  rtdb 
} from "../firebase";
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  serverTimestamp as firestoreTimestamp 
} from "firebase/firestore";
import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  onDisconnect, 
  serverTimestamp as rtdbTimestamp 
} from "firebase/database";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile to Firestore and handle RTDB online/offline presence
  const setupUserPresenceAndProfile = async (currentUser) => {
    if (!currentUser) return;

    // 1. Sync User Profile in Firestore
    const userDocRef = doc(db, "users", currentUser.uid);
    const userData = {
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
      photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
      email: currentUser.email,
      lastSeen: firestoreTimestamp()
    };
    
    try {
      await setDoc(userDocRef, userData, { merge: true });
    } catch (err) {
      console.warn("Firestore user sync warning:", err);
    }

    // 2. Realtime Database Presence Setup
    try {
      const userStatusRef = rtdbRef(rtdb, `status/${currentUser.uid}`);
      const isOfflineForDatabase = {
        state: 'offline',
        last_changed: rtdbTimestamp()
      };
      const isOnlineForDatabase = {
        state: 'online',
        last_changed: rtdbTimestamp(),
        name: userData.name
      };

      // Set onDisconnect handler
      onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
        rtdbSet(userStatusRef, isOnlineForDatabase);
      });
    } catch (err) {
      console.warn("RTDB presence setup warning:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await setupUserPresenceAndProfile(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auth Methods
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password, displayName) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (res.user && displayName) {
      await updateProfile(res.user, { displayName });
    }
    return res;
  };

  const logout = async () => {
    if (user) {
      try {
        const userStatusRef = rtdbRef(rtdb, `status/${user.uid}`);
        await rtdbSet(userStatusRef, {
          state: 'offline',
          last_changed: rtdbTimestamp()
        });
      } catch (e) {
        console.warn("Failed to set offline status on logout:", e);
      }
    }
    return await signOut(auth);
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
