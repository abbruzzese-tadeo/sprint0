'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Home, Users, BookOpen, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
  const { role, logout, user } = useAuth();
  const router = useRouter();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // 🔹 Menú según el rol
  const menuItems = {
    admin: [
      { label: 'Dashboard', id: 'dashboard', icon: <Home size={18} />, path: '/dashboard/admin' },
      { label: 'Usuarios', id: 'usuarios', icon: <Users size={18} />, path: '/dashboard/admin/usuarios' },
      { label: 'Configuración', id: 'configuracion', icon: <Settings size={18} />, path: '/dashboard/admin/configuracion' },
    ],
    profesor: [
      { label: 'Mis Clases', id: 'clases', icon: <BookOpen size={18} />, path: '/dashboard/profesor/clases' },
      { label: 'Alumnos', id: 'alumnos', icon: <Users size={18} />, path: '/dashboard/profesor/alumnos' },
    ],
    alumno: [
      { label: 'Cursos', id: 'cursos', icon: <BookOpen size={18} />, path: '/dashboard/alumno/cursos' },
      { label: 'Perfil', id: 'perfil', icon: <Users size={18} />, path: '/dashboard/alumno/perfil' },
    ],
  };

  const items = role ? menuItems[role] || [] : [];

  // 🔹 Redirige al hacer click
  const handleClick = (id: string, path: string) => {
    setActiveItem(id);
    router.push(path);
  };

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col shadow-lg">
      {/* Header del Sidebar */}
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {/* Menú principal */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id, item.path)}
            className={clsx(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition',
              activeItem === item.id
                ? 'bg-gray-800 text-white'
                : 'hover:bg-gray-800 text-gray-300'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Sección del usuario */}
      <div className="border-t border-gray-800 bg-gray-900/50 p-4 mt-auto rounded-b-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-300 text-sm font-medium">Hola,</span>
            <span className="text-white text-sm truncate max-w-[150px]">
              {user?.email ?? 'invitado'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-200 hover:text-white transition"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
