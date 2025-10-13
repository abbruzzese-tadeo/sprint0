'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchAllUsers, updateUserRole } from '@/lib/userBatches';
import { UserProfile, Role } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

interface UsersContextType {
  users: UserProfile[];
  loading: boolean;
  error: string;
  fetchUsers: () => Promise<void>;
  handleUpdateRole: (uid: string, newRole: Role) => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider = ({ children }: { children: ReactNode }) => {
  const { user, authReady } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersList = await fetchAllUsers();
      setUsers(usersList);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (uid: string, newRole: Role) => {
  try {
    await updateUserRole(uid, newRole);
    await fetchUsers(); // refresca la lista después del cambio
    
  } catch (err) {
    alert('Error al actualizar rol: ' + (err as Error).message);
  }
};

  useEffect(() => {
    if (authReady && user?.role === 'admin') {
      fetchUsers();
    }
  }, [authReady, user]);

  return (
    <UsersContext.Provider
      value={{ users, loading, error, fetchUsers, handleUpdateRole }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers debe usarse dentro de un <UsersProvider>');
  }
  return context;
};
