// src/app/dashboard/layout.tsx
'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { UsersProvider } from '@/contexts/UserContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UsersProvider>
      <div className="flex">
        {/* Sidebar fijo */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex flex-col flex-1 ml-64 min-h-screen bg-gray-50 overflow-x-hidden">
          <Header />
          <main className="flex-1 p-6 w-[calc(100vw-16rem)] max-w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </UsersProvider>
  );
}
