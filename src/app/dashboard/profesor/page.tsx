import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header'; 

export default function ProfesorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['profesor']}>
    <Header /> 
      <div className="min-h-screen p-8 bg-gray-100 pt-20">
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Dashboard Profesor</h1>
        <p className="font-bold mb-4 text-gray-800">Placeholders para gestión de clases.</p>
        <div className="grid grid-cols-2 gap-4 mt-4 text-gray-800">
          <div className="bg-white p-4 rounded shadow mb-4 text-gray-800">Clase 1</div>
          <div className="bg-white p-4 rounded shadow mb-4 text-gray-800">Estudiantes</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}