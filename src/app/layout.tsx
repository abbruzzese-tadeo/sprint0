// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { UsersProvider } from '@/contexts/UserContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mi App Roles',
  description: 'App con auth por roles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <UsersProvider>
            {/* Layout global simple — NO sidebar ni header aquí */}
            <div className="min-h-screen bg-gray-50">
              {children}
            </div>
          </UsersProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
