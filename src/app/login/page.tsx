'use client';

import { useState, useEffect } from 'react'; // Agrega useEffect
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const { user, role, authReady } = useAuth(); // Usa user y role del context
  const router = useRouter();

  // Nuevo: useEffect para redirigir automáticamente si ya está logueado
  useEffect(() => {
    if (authReady && user && role) {
      // Redirige basado en rol
      switch (role) {
        case 'alumno': router.push('/dashboard/alumno'); break;
        case 'profesor': router.push('/dashboard/profesor'); break;
        case 'admin': router.push('/dashboard/admin'); break;
        default: router.push('/dashboard/alumno'); // Fallback
      }
    }
  }, [user, role, authReady, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // El context maneja el rol y redirección via useEffect arriba
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Fallback: Pequeño delay para que el context actualice, luego redirige
        setTimeout(() => {
          if (user && role) {
            switch (role) {
              case 'alumno': router.push('/dashboard/alumno'); break;
              case 'profesor': router.push('/dashboard/profesor'); break;
              case 'admin': router.push('/dashboard/admin'); break;
              default: router.push('/dashboard/alumno');
            }
          }
        }, 500); // 500ms para que onAuthStateChanged termine
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Si está cargando o ya logueado, muestra loading o redirige (maneja en useEffect)
  if (!authReady) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleAuth} className="p-8 bg-white rounded-lg shadow-lg w-96"> {/* Mejora shadow */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">{isRegister ? 'Registro' : 'Login'}</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />
        <button 
          type="submit" 
          className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-3 rounded-lg font-medium transition duration-200 transform hover:scale-105 shadow-md" // Mejora hover aquí
        >
          {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
        </button>
        {error && <p className="text-red-500 mt-3 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full text-blue-500 hover:text-blue-700 active:text-blue-800 mt-4 text-sm font-medium transition duration-200" // Mejora hover
        >
          {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
}