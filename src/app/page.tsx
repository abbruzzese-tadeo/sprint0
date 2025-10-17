'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, role, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && user && role) {
      switch (role) {
        case 'alumno': router.push('/dashboard/'); break;
        case 'profesor': router.push('/dashboard/'); break;
        case 'admin': router.push('/dashboard/'); break;
      }
    }
  }, [user, role, authReady, router]);

  if (!authReady) return <div>Cargando...</div>;

  return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
       <div className="text-center">
         <h1 className="text-4xl font-bold text-gray-800 mb-4">Bienvenido</h1> {/* Mejora color */}
         <p className="text-gray-700 text-lg mb-4">Por favor, inicia sesión.</p> {/* Mejora color */}
         <a href="/login" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-medium transition">
           Ir a Login
         </a>
       </div>
     </div>
   );
}