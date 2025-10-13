'use client';

import { useState, useEffect } from 'react';
import { fetchAllUsers, updateUserRole } from '@/lib/userBatches'; 
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Role } from '@/types/auth';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminDashboard() {
  const { user, authReady } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Fetch todos los users al cargar
useEffect(() => {
       if (authReady && user?.role === 'admin') {
         fetchUsers();
       }
     }, [authReady, user]);
     const fetchUsers = async () => {
       try {
         setLoading(true);
         const usersList = await fetchAllUsers();
         setUsers(usersList);
       } catch (err: any) {
         setError('Error al cargar usuarios: ' + err.message);
         console.error(err);
       } finally {
         setLoading(false);
       }
     };

  const handleUpdateRole = async (uid: string, newRole: Role) => {
       try {
         setError('');
         await updateUserRole(uid, newRole);
         // Re-fetch para UI actualizada
         await fetchUsers();
         alert(`Rol de ${newRole} asignado a ${uid}`);
       } catch (err: any) {
         setError('Error al actualizar rol: ' + err.message);
         console.error(err);
       }
     };

  if (!authReady) return <div>Cargando...</div>;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Header />
      <div className="min-h-screen p-8 bg-gray-100 pt-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard Admin - Gestión de Usuarios</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-600">Cargando usuarios...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    users.map((userProfile) => (
                      <tr key={userProfile.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {userProfile.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            userProfile.role === 'admin' ? 'bg-red-100 text-red-800' :
                            userProfile.role === 'profesor' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {userProfile.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingUserId === userProfile.uid ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={userProfile.role}
                                onChange={(e) => handleUpdateRole(userProfile.uid, e.target.value as Role)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-800"
                              >
                                <option value="alumno">Alumno</option>
                                <option value="profesor">Profesor</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingUserId(userProfile.uid)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Editar Rol
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Refrescar Lista
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}