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
    if (!currentUser || currentUser.isDemo) return;

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userData = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
        photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
        email: currentUser.email,
        lastSeen: firestoreTimestamp()
      };
      await setDoc(userDocRef, userData, { merge: true });
    } catch (err) {
      console.warn("Firestore user sync info:", err);
    }

    try {
      const userStatusRef = rtdbRef(rtdb, `status/${currentUser.uid}`);
      const isOfflineForDatabase = { state: 'offline', last_changed: rtdbTimestamp() };
      const isOnlineForDatabase = { state: 'online', last_changed: rtdbTimestamp(), name: currentUser.displayName };

      onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
        rtdbSet(userStatusRef, isOnlineForDatabase);
      });
    } catch (err) {
      console.warn("RTDB presence setup info:", err);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          await setupUserPresenceAndProfile(currentUser);
        }
        setLoading(false);
      }, (error) => {
        console.warn("Auth state observer fallback:", error);
        setLoading(false);
      });
    } catch (e) {
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Helper for demo fallback user
  const createDemoUser = (email, displayName) => {
    const name = displayName || (email ? email.split('@')[0] : "Chirag");
    const demoUser = {
      uid: "demo_user_" + Math.floor(1000 + Math.random() * 9000),
      displayName: name,
      email: email || "chirag@example.com",
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      isDemo: true
    };
    setUser(demoUser);
    return demoUser;
  };

  // Auth Methods with fallback for demo / missing API key
  const loginWithGoogle = async () => {
    try {
      return await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code?.includes("api-key") || err.message?.includes("api-key")) {
        console.info("Using Demo Authentication Mode (Valid Firebase API key not found in .env)");
        return createDemoUser("chiragborkar70@gmail.com", "Chirag");
      }
      throw err;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code?.includes("api-key") || err.message?.includes("api-key")) {
        console.info("Using Demo Authentication Mode");
        return createDemoUser(email, email.split('@')[0]);
      }
      throw err;
    }
  };

  const signupWithEmail = async (email, password, displayName) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user && displayName) {
        await updateProfile(res.user, { displayName });
      }
      return res;
    } catch (err) {
      if (err.code?.includes("api-key") || err.message?.includes("api-key")) {
        console.info("Using Demo Authentication Mode");
        return createDemoUser(email, displayName);
      }
      throw err;
    }
  };

  const logout = async () => {
    if (user && !user.isDemo) {
      try {
        const userStatusRef = rtdbRef(rtdb, `status/${user.uid}`);
        await rtdbSet(userStatusRef, { state: 'offline', last_changed: rtdbTimestamp() });
      } catch (e) {}
      try {
        await signOut(auth);
      } catch (e) {}
    }
    setUser(null);
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
