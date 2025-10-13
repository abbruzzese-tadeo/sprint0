import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header'; 

export default function AlumnoDashboard() {
  return (
    <ProtectedRoute allowedRoles={['alumno']}>
      <Header /> 
      <div className="min-h-screen p-8 bg-gray-100 pt-20"> 
        <h1 className="text-3xl font-bold mb-4 text-gray-800">Dashboard Alumno</h1> 
        <p className="text-gray-700 mb-4">Placeholders para contenido del alumno.</p> 
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow text-gray-800">Módulo 1</div> 
          <div className="bg-white p-4 rounded shadow text-gray-800">Módulo 2</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}