'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, authReady } = useAuth();
  const router = useRouter();

  // ✅ Redirigir solo cuando el AuthContext confirma usuario activo
  useEffect(() => {
    if (authReady && user) {
      router.replace('/dashboard'); // replace evita volver atrás
    }
  }, [authReady, user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Cuenta creada exitosamente. Ahora iniciá sesión.');
        setIsRegister(false);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // 👇 ya NO hacemos router.push() acá
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err);
      setError('Credenciales incorrectas o error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Cargando autenticación...
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleAuth} className="p-8 bg-white rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          {isRegister ? 'Registro' : 'Login'}
        </h2>

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
          disabled={loading}
          className={`w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-3 rounded-lg font-medium transition duration-200 transform hover:scale-105 shadow-md ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading
            ? 'Procesando...'
            : isRegister
            ? 'Registrarse'
            : 'Iniciar Sesión'}
        </button>

        {error && (
          <p className="text-red-500 mt-3 text-sm text-center bg-red-50 p-2 rounded">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full text-blue-500 hover:text-blue-700 mt-4 text-sm font-medium transition duration-200"
        >
          {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
        </button>
      </form>
    </div>
  );
}
