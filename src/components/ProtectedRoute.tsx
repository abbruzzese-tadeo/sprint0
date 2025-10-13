'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, authReady, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authReady) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(role || '')) {
        // Redirige basado en rol
        switch (role) {
          case 'alumno': router.push('/dashboard/alumno'); break;
          case 'profesor': router.push('/dashboard/profesor'); break;
          case 'admin': router.push('/dashboard/admin'); break;
          default: router.push('/login');
        }
      }
    }
  }, [user, role, authReady, loading, router, allowedRoles]);

  if (loading || !authReady) return <div>Cargando...</div>;
  if (!user) return <div>Redirigiendo...</div>;

  return <>{children}</>;
}