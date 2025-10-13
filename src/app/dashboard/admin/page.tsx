'use client';

import { useEffect, useState } from 'react';
import { useUsers } from '@/contexts/UserContext';
import { Role } from '@/types/auth';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmationModal from '@/components/ConfirmationModal';

interface StudentRow {
  student: string;
  email: string;
  status: string;
  level: string;
  language: string;
  teacher: string;
  format: string;
  delivery: string;
  schedule: string;
}

export default function AdminDashboard() {
  const { users, loading: userLoading, error, fetchUsers, handleUpdateRole } = useUsers();

  // Estado del modal
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Estado de mensaje de éxito
  const [successMessage, setSuccessMessage] = useState('');

  // Datos del sheet
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(true);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
  const loadSheets = async () => {
    try {
      setLoadingSheet(true);
      const res = await fetch('/api/sheets/A');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error (${res.status}): ${text}`);
      }
      const json = await res.json();
      const allRows: string[][] = json.rows || [];

      if (allRows.length > 0) {
        setHeaders(allRows[0]);       // Primera fila: encabezados
        setRows(allRows.slice(1));    // El resto: datos

        // Si quieres seguir usando students con objetos:
        const studentsData = allRows.slice(1).map((r) => ({
          student: r[0] || '',
          email: r[1] || '',
          status: r[2] || '',
          level: r[3] || '',
          language: r[4] || '',
          teacher: r[5] || '',
          format: r[6] || '',
          delivery: r[7] || '',
          schedule: r[8] || '',
        }));
        setStudents(studentsData);
      } else {
        setHeaders([]);
        setRows([]);
        setStudents([]);
      }
    } catch (err) {
      console.error(err);
      setSheetError('Error al cargar los datos desde Google Sheets.');
    } finally {
      setLoadingSheet(false);
    }
  };

  loadSheets();
}, []);

  const onSelectRole = (uid: string, email: string, newRole: Role) => {
    setPendingUserId(uid);
    setPendingUserEmail(email);
    setPendingRole(newRole);
    setModalOpen(true);
  };

  const onConfirmChange = async () => {
    if (!pendingUserId || !pendingRole) return;
    try {
      setConfirmLoading(true);
      await handleUpdateRole(pendingUserId, pendingRole);
      await fetchUsers();

      setSuccessMessage(
        `Rol actualizado correctamente para ${pendingUserEmail} (${pendingRole})`
      );

      // Limpiar y cerrar todo
      setModalOpen(false);
      setEditingUserId(null);
      setPendingUserId(null);
      setPendingRole(null);
      setPendingUserEmail(null);

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error al actualizar rol:', err);
    } finally {
      setConfirmLoading(false);
    }
  };

  const onCancelChange = () => {
    setModalOpen(false);
    setPendingUserId(null);
    setPendingRole(null);
    setPendingUserEmail(null);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Header />
      <div className="min-h-screen p-8 bg-gray-100 pt-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">
            Dashboard Admin
          </h1>

          {/* Mensajes */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {sheetError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {sheetError}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {successMessage}
            </div>
          )}

          {/* Tabla de usuarios (roles) */}
          <div className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Gestión de Roles</h2>

            {userLoading ? (
              <div className="text-center text-gray-600">Cargando usuarios...</div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol Actual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-black">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    ) : (
                      users.map((userProfile) => (
                        <tr key={userProfile.uid} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {userProfile.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                userProfile.role === 'admin'
                                  ? 'bg-red-100 text-red-800'
                                  : userProfile.role === 'profesor'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {userProfile.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {editingUserId === userProfile.uid ? (
                              <div className="flex items-center space-x-2">
                                <select
                                  value={userProfile.role}
                                  onChange={(e) =>
                                    onSelectRole(
                                      userProfile.uid,
                                      userProfile.email,
                                      e.target.value as Role
                                    )
                                  }
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
          </div>

          {/* Tabla de datos del Sheet */}
          <div>
  <h2 className="text-xl font-semibold mb-3 text-gray-700">
    Datos de {headers[0] || 'Alumnos'}
  </h2>

  {loadingSheet ? (
    <div className="text-center text-gray-600">Cargando datos del sheet...</div>
  ) : (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-black">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {row.map((cell: string, idx: number) => (
                <td key={idx} className="px-6 py-3">
                  {/* Para la columna 'status', aplicamos el estilo especial */}
                  {headers[idx]?.toLowerCase() === 'status' ? (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        cell.toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>


          <div className="mt-6 text-center">
            <button
              onClick={() => {
                fetchUsers();
                window.location.reload();
              }}
              disabled={userLoading || loadingSheet}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Refrescar Todo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmationModal
        open={modalOpen}
        title="Confirmar cambio de rol"
        description={
          pendingUserEmail && pendingRole
            ? `¿Seguro que querés cambiar el rol de "${pendingUserEmail}" a "${pendingRole}"?`
            : '¿Seguro que querés aplicar los cambios?'
        }
        confirmLabel="Sí, aplicar"
        cancelLabel="Cancelar"
        onConfirm={onConfirmChange}
        onCancel={onCancelChange}
        loading={confirmLoading}
      />
    </ProtectedRoute>
  );
}
