'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { FiMail, FiLock, FiUser } from "react-icons/fi";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8 border border-gray-100">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Further Academy
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isRegister ? "Crea una nueva cuenta" : "Inicia sesión para continuar"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 bg-red-50 border border-red-100 rounded-md text-center py-2 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 text-white font-medium rounded-lg transition shadow-md ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {loading
              ? "Procesando..."
              : isRegister
              ? "Crear cuenta"
              : "Iniciar Sesión"}
          </button>
        </form>

        {/* Switch login/register */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition"
          >
            {isRegister ? "Ya tengo una cuenta" : "Crear cuenta nueva"}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Further Academy. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
