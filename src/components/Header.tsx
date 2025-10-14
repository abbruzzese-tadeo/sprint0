// src/components/Header.tsx
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-blue-600 text-white shadow">
      {/* El contenedor centra y tiene la misma max-width que tu contenido */}
      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">
        <div className="text-lg font-semibold">Mi App</div>

        <div className="flex items-center gap-4">
          <span className="text-sm">Hola, {user?.email ?? 'invitado'}</span>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
