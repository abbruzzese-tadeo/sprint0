'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Home, Users, BookOpen, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
  const { role, logout } = useAuth();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Menú según el rol
  const menuItems = {
    admin: [
      { label: 'Dashboard', id: 'dashboard', icon: <Home size={18} /> },
      { label: 'Usuarios', id: 'usuarios', icon: <Users size={18} /> },
      { label: 'Configuración', id: 'configuracion', icon: <Settings size={18} /> },
    ],
    profesor: [
      { label: 'Mis Clases', id: 'clases', icon: <BookOpen size={18} /> },
      { label: 'Alumnos', id: 'alumnos', icon: <Users size={18} /> },
    ],
    alumno: [
      { label: 'Cursos', id: 'cursos', icon: <BookOpen size={18} /> },
      { label: 'Perfil', id: 'perfil', icon: <Users size={18} /> },
    ],
  };

  const items = role ? menuItems[role] || [] : [];

  // 🔹 No redirige, solo cambia el "activo"
  const handleClick = (id: string) => {
    setActiveItem(id);
    // Aquí podrías emitir un evento, usar context, o estado global
    // para cambiar el contenido visible sin redirigir
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col shadow-lg">
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
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

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-800 transition text-left"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
