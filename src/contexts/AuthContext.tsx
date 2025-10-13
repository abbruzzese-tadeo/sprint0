'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthUser, Role } from '@/types/auth';
import { fetchUserFromBatches } from '@/lib/userBatches'; // Nueva import

interface AuthContextType {
  user: AuthUser | null;
  role: Role | null;
  authReady: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch perfil desde batches o specialUsers
          const profile = await fetchUserFromBatches(firebaseUser.uid);
          if (profile) {
            setUser({ ...firebaseUser, role: profile.role } as AuthUser);
            setRole(profile.role);
          } else {
            // Nuevo usuario: Agrega a batch (default 'alumno')
            await import('@/lib/userBatches').then(({ addUserToBatch }) => addUserToBatch(firebaseUser, 'alumno'));
            // Re-fetch después de agregar
            const newProfile = await fetchUserFromBatches(firebaseUser.uid);
            if (newProfile) {
              setUser({ ...firebaseUser, role: newProfile.role } as AuthUser);
              setRole(newProfile.role);
            }
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Error en AuthContext:', error);
        if (firebaseUser) {
          setUser({ ...firebaseUser, role: 'alumno' } as AuthUser); // Fallback
          setRole('alumno');
        } else {
          setUser(null);
          setRole(null);
        }
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, authReady, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (undefined === context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};