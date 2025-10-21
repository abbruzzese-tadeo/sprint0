// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { UsersProvider } from '@/contexts/UserContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mi App Roles',
  description: 'App con autenticación y roles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* ✅ AuthProvider en el nivel global */}
        <AuthProvider>
          <UsersProvider>
            <main className="min-h-screen bg-gray-50">{children}</main>
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
