'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirige a home después de logout
  };

  if (!user) return null;

  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Mi App</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm">Hola, {user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 px-4 py-2 rounded text-white transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}