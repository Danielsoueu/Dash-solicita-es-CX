import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  allowedDomains: string[];
  updateAllowedDomains: (domains: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_PROFILE_KEY = 'finhero_user_profile';
const DEFAULT_ALLOWED_DOMAINS = ['companyhero.com', 'gmail.com', 'finhero.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(DEFAULT_ALLOWED_DOMAINS);

  // Load corporate settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'auth_config');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().allowedDomains) {
          setAllowedDomains(settingsSnap.data().allowedDomains);
        } else {
          // Initialize settings doc
          await setDoc(settingsRef, {
            allowedDomains: DEFAULT_ALLOWED_DOMAINS,
            restrictedDomainMode: true
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Could not load settings from Firestore, using defaults:', e);
      }
    };
    fetchSettings();
  }, []);

  // Sync Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (!authUser) {
        setFirebaseUser(null);
        setUserProfile(null);
        localStorage.removeItem(USER_PROFILE_KEY);
        setLoading(false);
        return;
      }

      setFirebaseUser(authUser);

      try {
        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', authUser.uid);
        const userSnap = await getDoc(userRef);

        const email = authUser.email || '';
        const emailDomain = email.includes('@') ? email.split('@')[1].toLowerCase() : '';

        // Check if user is inactive or unauthorized
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          if (data.status === 'inactive') {
            setAuthError('login.inactiveUserError');
            await firebaseSignOut(auth);
            setUserProfile(null);
            localStorage.removeItem(USER_PROFILE_KEY);
            setLoading(false);
            return;
          }

          const updatedProfile: UserProfile = {
            ...data,
            uid: authUser.uid,
            email: authUser.email || data.email,
            displayName: authUser.displayName || data.displayName || 'User',
            photoURL: authUser.photoURL || data.photoURL || '',
            lastLoginAt: new Date().toISOString()
          };

          await updateDoc(userRef, {
            lastLoginAt: updatedProfile.lastLoginAt,
            displayName: updatedProfile.displayName,
            photoURL: updatedProfile.photoURL
          });

          setUserProfile(updatedProfile);
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));
        } else {
          // Verify domain access for new users
          const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.some(d => d.trim().toLowerCase() === emailDomain);
          
          if (!isDomainAllowed) {
            setAuthError('login.unauthorizedDomainError');
            await firebaseSignOut(auth);
            setUserProfile(null);
            localStorage.removeItem(USER_PROFILE_KEY);
            setLoading(false);
            return;
          }

          // Check how many users exist to set first user as admin
          let initialRole: UserRole = 'user';
          try {
            const usersColl = collection(db, 'users');
            const usersSnap = await getDocs(usersColl);
            if (usersSnap.empty) {
              initialRole = 'admin'; // First registered user is automatically admin
            }
          } catch {
            initialRole = 'admin';
          }

          // Force admin if email contains admin or companyhero
          if (email.includes('admin') || email.includes('hero')) {
            initialRole = 'admin';
          }

          const newProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'Hero User',
            photoURL: authUser.photoURL || '',
            role: initialRole,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };

          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile));
        }
      } catch (err: any) {
        console.error('Error synchronizing user profile:', err);
        setAuthError('login.generalError');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [allowedDomains]);

  const loginWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthError(null);
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError('login.unauthorizedDomainError');
      } else {
        setAuthError('login.generalError');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Error logging out:', e);
    } finally {
      setFirebaseUser(null);
      setUserProfile(null);
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  };

  const updateAllowedDomains = async (domains: string[]) => {
    setAllowedDomains(domains);
    try {
      const settingsRef = doc(db, 'settings', 'auth_config');
      await setDoc(settingsRef, { allowedDomains: domains }, { merge: true });
    } catch (e) {
      console.error('Failed to update domain settings:', e);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      loading,
      authError,
      loginWithGoogle,
      logout,
      clearAuthError,
      allowedDomains,
      updateAllowedDomains
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
